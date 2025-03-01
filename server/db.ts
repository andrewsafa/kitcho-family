import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon's connection pooling
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create Drizzle instance with schema
const db = drizzle(pool, { schema });

// Test the connection and schema
(async () => {
  try {
    // Simple query to test connection
    const result = await pool.query('SELECT 1 as test');
    if (result.rows[0].test === 1) {
      console.log('Successfully connected to PostgreSQL database');
    }

    // Test schema by querying tables
    await db.select().from(schema.customers).limit(1);
    console.log('Database schema verified successfully');

  } catch (error) {
    console.error('Database connection or schema error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    // Don't exit process, but log the error for debugging
    console.error('Please check your database configuration and schema');
  }
})();

export { db, pool };