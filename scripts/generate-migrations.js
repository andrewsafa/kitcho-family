#!/usr/bin/env node

/**
 * This script generates database migrations using Drizzle Kit.
 * It should be run before deployment to ensure migrations are up-to-date.
 * Can be used with both Railway and AWS Elastic Beanstalk deployments.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Deployment platform auto-detection
const isAWS = process.env.AWS_EXECUTION_ENV || process.env.AWS_REGION;
const isRailway = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_SERVICE_ID;
const deploymentPlatform = isAWS ? 'AWS' : (isRailway ? 'Railway' : 'unknown');

console.log(`Detected deployment platform: ${deploymentPlatform}`);
console.log('Current working directory:', process.cwd());

// Ensure the migrations directory exists
const migrationsDir = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.log('Creating migrations directory...');
  fs.mkdirSync(migrationsDir, { recursive: true });
}

try {
  console.log('Generating database migrations...');
  execSync('npx drizzle-kit generate:pg', { stdio: 'inherit' });
  
  // Count the number of migration files
  const migrationFiles = fs.readdirSync(migrationsDir);
  console.log(`\n✅ Migrations generated successfully! Found ${migrationFiles.length} migration files.`);
  
  if (deploymentPlatform === 'unknown') {
    console.log('\n📋 Deployment Checklist:');
    console.log('1. Commit these migrations to your repository');
    console.log('2. Ensure DATABASE_URL environment variable is set in your deployment platform');
    console.log('3. Make sure your deployment process runs migrations before starting the app');
    console.log('\nFor Railway:');
    console.log('- The Procfile is configured to run migrations automatically');
    console.log('- Ensure your railway.toml has the correct startCommand');
    console.log('\nFor AWS Elastic Beanstalk:');
    console.log('- The .ebextensions/nodecommand.config is configured properly');
    console.log('- The migration script will run with retries if the database is not immediately available');
  }
  
  // Create a file with timestamp to track last migration generation
  const timestamp = new Date().toISOString();
  fs.writeFileSync(
    path.join(migrationsDir, '.last-generated'), 
    `Migrations last generated at: ${timestamp}\nPlatform: ${deploymentPlatform}\n`
  );
  
} catch (error) {
  console.error('❌ Error generating migrations:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Additional checks for migrations completeness
try {
  console.log('\nValidating migrations...');
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'));
  
  if (migrationFiles.length === 0) {
    console.warn('⚠️ Warning: No SQL migration files found in the migrations directory.');
    console.warn('This may be normal if no schema changes were made since the last migration.');
  } else {
    console.log(`Found ${migrationFiles.length} SQL migration files.`);
    
    // Check the most recent migration file
    const latestMigration = migrationFiles
      .sort()
      .reverse()[0];
    
    console.log(`Latest migration file: ${latestMigration}`);
  }
  
  console.log('\n✅ Migration validation complete.');
} catch (error) {
  console.error('⚠️ Warning: Could not validate migrations:', error.message);
}