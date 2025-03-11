#!/usr/bin/env node

/**
 * Kitcho Family - Database Migration Generator
 * 
 * This script generates database migrations using Drizzle Kit.
 * It should be run before deployment to ensure migrations are up-to-date.
 * Supports Railway, AWS Elastic Beanstalk, Render, Vercel, and other platforms.
 * 
 * Usage:
 *   npm run generate       # Generate migrations for development
 *   NODE_ENV=production npm run generate  # Generate for production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper functions
function detectPlatform() {
  // Deployment platform auto-detection
  if (process.env.AWS_EXECUTION_ENV || process.env.AWS_REGION) {
    return 'AWS';
  } 
  if (process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_SERVICE_ID) {
    return 'Railway';
  }
  if (process.env.REPL_ID || process.env.REPL_OWNER) {
    return 'Replit';
  }
  if (process.env.RENDER || process.env.IS_RENDER) {
    return 'Render';
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return 'Vercel';
  }
  return 'Local';
}

function printBanner() {
  console.log(`
🗄️  Kitcho Family - Database Migration Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment: ${process.env.NODE_ENV || 'development'}
Platform: ${deploymentPlatform}
Node Version: ${process.version}
OS: ${os.type()} ${os.release()}
Time: ${new Date().toISOString()}
`);
}

function printDeploymentGuide() {
  console.log(`
📋 Deployment & Migration Guide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Prerequisites:
   - Ensure a PostgreSQL database is provisioned
   - Set DATABASE_URL environment variable
   - Set SESSION_SECRET environment variable

2️⃣ Required Environment Variables:
   - DATABASE_URL: PostgreSQL connection string
   - SESSION_SECRET: String for session management
   - NODE_ENV: Set to 'production' for production deployments

3️⃣ Platform-Specific Instructions:

   Railway:
   - The Procfile runs migrations automatically
   - Check railway.toml has the correct startCommand
   - URL format: https://{project-name}.railway.app

   AWS Elastic Beanstalk:
   - Configuration in .ebextensions/nodecommand.config
   - Migration runs with retries if DB isn't available
   - URL format: http://{app-name}.{region}.elasticbeanstalk.com

   Render:
   - Add 'npm run migrate' to your start command
   - Set DATABASE_URL and SESSION_SECRET
   - URL format: https://{service-name}.onrender.com

   Vercel:
   - Deploy PostgreSQL separately (e.g. Railway, Neon)
   - Add build command to run migrations
   - URL format: https://{project-name}.vercel.app
`);
}

// Main execution
const deploymentPlatform = detectPlatform();
printBanner();

// Ensure the migrations directory exists
const migrationsDir = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.log('📁 Creating migrations directory...');
  fs.mkdirSync(migrationsDir, { recursive: true });
}

try {
  console.log('🔄 Generating database migrations...');
  
  // Run drizzle-kit with error handling
  try {
    execSync('npx drizzle-kit generate:pg', { 
      stdio: 'inherit',
      timeout: 30000 // 30 seconds timeout
    });
  } catch (genError) {
    console.error('❌ Error during migration generation:', genError.message);
    
    // Try with more verbose output in case of failure
    console.log('\n🔍 Retrying with verbose output:');
    execSync('npx drizzle-kit generate:pg --verbose', { 
      stdio: 'inherit',
      timeout: 30000
    });
  }
  
  // Count and validate the migration files
  const allFiles = fs.readdirSync(migrationsDir);
  const migrationFiles = allFiles.filter(file => file.endsWith('.sql'));
  
  console.log(`\n✅ Migration generation process complete!`);
  console.log(`📊 Found ${migrationFiles.length} SQL migration files out of ${allFiles.length} total files.`);
  
  if (migrationFiles.length === 0) {
    console.warn('\n⚠️ No SQL migration files found. This could mean:');
    console.warn('  - No schema changes were made since last migration');
    console.warn('  - The schema.ts file has no changes');
    console.warn('  - There might be an issue with the drizzle configuration');
  } else {
    // Get the most recent migration files
    const latestMigrations = migrationFiles
      .sort()
      .reverse()
      .slice(0, 3);
    
    console.log('\n📄 Latest migration files:');
    latestMigrations.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    // Validate SQL in latest migration
    try {
      const latestContent = fs.readFileSync(path.join(migrationsDir, latestMigrations[0]), 'utf8');
      const sqlStatementCount = (latestContent.match(/;/g) || []).length;
      console.log(`  💡 The latest migration contains approximately ${sqlStatementCount} SQL statements`);
    } catch (readError) {
      console.warn(`  ⚠️ Could not analyze latest migration file: ${readError.message}`);
    }
  }
  
  // Create a metadata file to track migration generation
  const metadata = {
    timestamp: new Date().toISOString(),
    platform: deploymentPlatform,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    migrationCount: migrationFiles.length,
    generatedBy: 'drizzle-kit'
  };
  
  fs.writeFileSync(
    path.join(migrationsDir, '.migration-metadata.json'), 
    JSON.stringify(metadata, null, 2)
  );
  
  // Show deployment guide for local development
  if (deploymentPlatform === 'Local') {
    printDeploymentGuide();
  }
  
} catch (error) {
  console.error('\n❌ Migration generation failed with error:');
  console.error(error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

// Validate migration directory structure
try {
  console.log('\n🔍 Validating migration directory structure...');
  
  // Check for metadata folders (these should exist if migrations were generated)
  const meta0001Dir = path.join(migrationsDir, 'meta');
  const meta0000Dir = path.join(migrationsDir, 'meta/_journal.json');
  
  if (!fs.existsSync(meta0001Dir)) {
    console.warn(`⚠️ Warning: Missing metadata directory '${meta0001Dir}'`);
    console.warn('This could indicate an issue with the migration generation process.');
  } else {
    console.log('✓ Metadata directory found');
  }
  
  if (!fs.existsSync(meta0000Dir)) {
    console.warn(`⚠️ Warning: Missing migration journal '${meta0000Dir}'`);
    console.warn('Migrations may not apply correctly without the journal file.');
  } else {
    console.log('✓ Migration journal found');
    
    // Validate journal content
    try {
      const journal = require(meta0000Dir);
      console.log(`✓ Migration journal contains ${journal.entries?.length || 0} entries`);
    } catch (e) {
      console.warn(`⚠️ Warning: Could not parse migration journal: ${e.message}`);
    }
  }
  
  console.log('\n✅ Migration validation complete.');
} catch (error) {
  console.error('⚠️ Warning: Could not validate migrations:', error.message);
}