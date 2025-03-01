import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from "@shared/schema";

// Validate database URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a Neon client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance with schema
const db = drizzle(sql);

// Test the connection and schema
(async () => {
  try {
    // Simple query to test connection
    await sql`SELECT 1`;
    console.log('Successfully connected to PostgreSQL database');

    // Test schema by querying tables
    await db.select().from(schema.customers).limit(1);
    console.log('Database schema verified successfully');

  } catch (error) {
    console.error('Database connection or schema error:', error);
    // Don't exit process, but log the error for debugging
    console.error('Please check your database configuration and schema');
  }
})();

export { db, sql };