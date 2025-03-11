
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

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
    
    console.log(`Found ${files.length} migration files in ${migrationsPath}`);
    return true;
  } catch (error) {
    console.error(`Error checking migrations directory: ${error}`);
    return false;
  }
}

// Migration function with retries
async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const migrationsFolder = process.env.MIGRATIONS_PATH || "./migrations";
  const absoluteMigrationsPath = path.resolve(process.cwd(), migrationsFolder);
  
  console.log(`Starting database migration. Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Using migrations path: ${absoluteMigrationsPath}`);
  
  // Check if migrations directory exists and has files
  const migrationsExist = verifyMigrationsDirectory(absoluteMigrationsPath);
  if (!migrationsExist && process.env.NODE_ENV === 'production') {
    console.warn('No migrations found but continuing in production mode');
  }
  
  let retries = 0;
  let migrationSuccess = false;
  
  while (retries < MAX_RETRIES && !migrationSuccess) {
    if (retries > 0) {
      console.log(`Retrying migration (${retries}/${MAX_RETRIES}) after delay...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
    
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 1, // Limit connections for migration
      connectionTimeoutMillis: 30000 // 30 seconds
    });
    
    try {
      // Test connection before attempting migration
      console.log("Testing database connection...");
      await pool.query("SELECT 1");
      console.log("Database connection successful");
      
      const db = drizzle(pool);
      
      // Run migrations
      console.log("Applying migrations...");
      await migrate(db, { migrationsFolder });
      
      console.log("✅ Migration completed successfully!");
      migrationSuccess = true;
    } catch (error) {
      retries++;
      console.error(`Migration attempt ${retries} failed:`, error);
      
      if (retries >= MAX_RETRIES) {
        console.error(`Migration failed after ${MAX_RETRIES} attempts`);
        process.exit(1);
      }
    } finally {
      try {
        await pool.end();
      } catch (error) {
        console.error("Error closing database pool:", error);
      }
    }
  }
  
  console.log("Database migration process complete");
}

// Execute migration with error handling
runMigration()
  .then(() => {
    console.log("Migration process exited successfully");
  })
  .catch((error) => {
    console.error("Unhandled error in migration process:", error);
    process.exit(1);
  });
