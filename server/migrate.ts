import { exec } from 'child_process';
import { storage } from './storage';
import { log } from './vite';

/**
 * Run database migrations for Railway deployment
 * This script is called by the Procfile during deployment
 */
async function runMigrations() {
  log('Starting database migrations for deployment', 'migrate');
  
  try {
    // First verify database connection
    const connected = await storage.testConnection();
    if (!connected) {
      throw new Error('Cannot run migrations - database connection failed');
    }
    log('Database connection successful', 'migrate');

    // Run drizzle push to synchronize schema
    log('Running drizzle-kit push to update database schema', 'migrate');
    await execCommand('npx drizzle-kit push');
    log('Schema migration completed successfully', 'migrate');

    // Initialize verification codes and passwords
    log('Ensuring all customers have verification codes', 'migrate');
    await storage.ensureVerificationCodes();
    
    log('Ensuring all customers have passwords', 'migrate');
    await storage.ensureCustomerPasswords();

    log('All migrations completed successfully', 'migrate');
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    log(`Migration failed: ${error instanceof Error ? error.message : String(error)}`, 'migrate');
    // Exit with error code
    process.exit(1);
  }
}

/**
 * Execute a shell command and return a promise
 */
function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`Command execution error: ${error.message}`, 'migrate');
        reject(error);
        return;
      }
      if (stderr) {
        log(`Command stderr: ${stderr}`, 'migrate');
      }
      log(`Command stdout: ${stdout}`, 'migrate');
      resolve(stdout);
    });
  });
}

// Run migrations
runMigrations();