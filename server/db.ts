import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from "@shared/schema";

// Create a Neon client and wrap it in Drizzle
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Test the connection
(async () => {
  try {
    // Simple query to test connection
    await sql`SELECT 1`;
    console.log('Successfully connected to PostgreSQL database');
  } catch (error) {
    console.error('Database connection error:', error);
  }
})();

export { db };