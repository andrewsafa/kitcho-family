
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import os from "os";

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000; // 3 seconds
const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds
const PROGRESSIVE_BACKOFF = true; // Enable progressive backoff for retries

// Detect deployment platform
function detectDeploymentPlatform(): string {
  if (process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_SERVICE_ID) {
    return 'railway';
  }
  if (process.env.AWS_REGION || process.env.AWS_EXECUTION_ENV) {
    return 'aws';
  }
  if (process.env.REPL_ID || process.env.REPL_OWNER) {
    return 'replit';
  }
  if (process.env.RENDER || process.env.IS_RENDER) {
    return 'render';
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return 'vercel';
  }
  return 'unknown';
}

// Format error for better logging
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ''}`;
  }
  return String(error);
}

// Verify migrations directory exists
function verifyMigrationsDirectory(migrationsPath: string): boolean {
  try {
    if (!fs.existsSync(migrationsPath)) {
      console.error(`Migrations directory not found: ${migrationsPath}`);
      console.log('Creating migrations directory...');
      fs.mkdirSync(migrationsPath, { recursive: true });
      return false;
    }
    
    const files = fs.readdirSync(migrationsPath);
    if (files.length === 0) {
      console.warn(`Warning: Migrations directory is empty: ${migrationsPath}`);
      return false;
    }
    
    const sqlFiles = files.filter(f => f.endsWith('.sql'));
    console.log(`Found ${sqlFiles.length} SQL migration files in ${migrationsPath}`);
    return sqlFiles.length > 0;
  } catch (error) {
    console.error(`Error checking migrations directory: ${formatError(error)}`);
    return false;
  }
}

// Get platform-specific migration settings
function getMigrationSettings(): { 
  maxRetries: number; 
  retryDelay: number; 
  connectionTimeout: number 
} {
  const platform = detectDeploymentPlatform();
  console.log(`Detected deployment platform: ${platform}`);
  
  // Platform-specific settings (can be customized based on platform characteristics)
  switch (platform) {
    case 'railway':
      return { 
        maxRetries: 5, 
        retryDelay: 3000, 
        connectionTimeout: 30000 
      };
    case 'aws':
      return { 
        maxRetries: 8, 
        retryDelay: 5000, 
        connectionTimeout: 60000 // AWS can take longer to establish connections
      };
    case 'render':
      return { 
        maxRetries: 6, 
        retryDelay: 4000, 
        connectionTimeout: 45000 
      };
    default:
      return { 
        maxRetries: MAX_RETRIES, 
        retryDelay: RETRY_DELAY_MS, 
        connectionTimeout: CONNECTION_TIMEOUT_MS 
      };
  }
}

// Migration function with retries and better error handling
async function runMigration() {
  // Check for required environment variable
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Set up migration paths and settings
  const { maxRetries, retryDelay, connectionTimeout } = getMigrationSettings();
  const startTime = Date.now();
  const migrationsFolder = process.env.MIGRATIONS_PATH || "./migrations";
  const absoluteMigrationsPath = path.resolve(process.cwd(), migrationsFolder);
  
  // Log system info for debugging
  console.log(`
🗄️ Starting database migration
   Environment: ${process.env.NODE_ENV || 'development'}
   Node Version: ${process.version}
   OS: ${os.type()} ${os.release()}
   Migrations Path: ${absoluteMigrationsPath}
   Max Retries: ${maxRetries}
   Connection Timeout: ${connectionTimeout}ms
`);
  
  // Check migrations directory
  const migrationsExist = verifyMigrationsDirectory(absoluteMigrationsPath);
  if (!migrationsExist) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ No migrations found but continuing in production mode');
    } else {
      console.warn('⚠️ No migrations found. Migration may not perform any database changes.');
    }
  }
  
  let retries = 0;
  let migrationSuccess = false;
  let lastError: unknown = null;
  
  // Migration retry loop
  while (retries < maxRetries && !migrationSuccess) {
    if (retries > 0) {
      // Calculate backoff time with progressive increase if enabled
      const backoffTime = PROGRESSIVE_BACKOFF 
        ? retryDelay * Math.pow(1.5, retries - 1) 
        : retryDelay;
        
      console.log(`⏳ Retrying migration (${retries}/${maxRetries}) after ${backoffTime}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
    
    // Create connection pool
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 1, // Limit connections for migration
      connectionTimeoutMillis: connectionTimeout
    });
    
    try {
      // Test connection before attempting migration
      console.log("🔄 Testing database connection...");
      const startConnectTime = Date.now();
      await pool.query("SELECT 1");
      console.log(`✓ Database connection successful (${Date.now() - startConnectTime}ms)`);
      
      // Get database version
      try {
        const versionResult = await pool.query("SELECT version()");
        console.log(`📊 Database version: ${versionResult.rows[0].version}`);
      } catch (e) {
        console.log("Could not retrieve database version");
      }
      
      // Initialize Drizzle and run migrations
      const db = drizzle(pool);
      
      console.log("⚙️ Applying migrations...");
      const startMigrateTime = Date.now();
      await migrate(db, { migrationsFolder });
      console.log(`✅ Migration completed successfully! (${Date.now() - startMigrateTime}ms)`);
      
      migrationSuccess = true;
    } catch (error) {
      retries++;
      lastError = error;
      console.error(`❌ Migration attempt ${retries} failed:`, formatError(error));
      
      if (retries >= maxRetries) {
        console.error(`❌ Migration failed after ${maxRetries} attempts`);
        console.error(`Last error: ${formatError(lastError)}`);
      }
    } finally {
      // Always close the pool
      try {
        await pool.end();
      } catch (error) {
        console.error("Error closing database pool:", formatError(error));
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  if (migrationSuccess) {
    console.log(`✅ Database migration process complete (total time: ${totalTime}ms)`);
    return true;
  } else {
    console.error(`❌ Database migration failed after ${retries} attempts (total time: ${totalTime}ms)`);
    throw lastError || new Error("Migration failed");
  }
}

// Execute migration with error handling
runMigration()
  .then(() => {
    console.log("✅ Migration process exited successfully");
    // Explicitly exit in case there are hanging connections
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unhandled error in migration process:", formatError(error));
    process.exit(1);
  });
