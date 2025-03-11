#!/usr/bin/env node

/**
 * This script generates database migrations using Drizzle Kit.
 * It should be run before deployment to ensure migrations are up-to-date.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the migrations directory exists
const migrationsDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.log('Creating migrations directory...');
  fs.mkdirSync(migrationsDir, { recursive: true });
}

try {
  console.log('Generating migrations...');
  execSync('npm run generate', { stdio: 'inherit' });
  
  console.log('\nMigrations generated successfully!');
  console.log('\nBefore deploying to Railway:');
  console.log('1. Commit these migrations to your repository');
  console.log('2. Make sure your Procfile includes a database migration step');
  console.log('3. Set up the DATABASE_URL environment variable in Railway');
} catch (error) {
  console.error('Error generating migrations:', error.message);
  process.exit(1);
}