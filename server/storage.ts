import { 
  type Customer, 
  type InsertCustomer,
  type PointTransaction,
  type InsertPointTransaction,
  type LevelBenefit,
  type InsertLevelBenefit,
  type Admin,
  type InsertAdmin,
  type SpecialEvent,
  type InsertSpecialEvent,
  type SpecialOffer,
  type InsertSpecialOffer,
  calculateLevel,
  calculatePointsWithMultiplier,
  customers,
  pointTransactions,
  levelBenefits,
  admins,
  specialEvents,
  specialOffers
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';
import connectPg from 'connect-pg-simple';
import session from 'express-session';

const PostgresSessionStore = connectPg(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface IStorage {
  // Keep existing interface methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByMobile(mobile: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  listCustomers(): Promise<Customer[]>;
  deleteCustomer(id: number): Promise<void>;
  addPoints(transaction: InsertPointTransaction): Promise<Customer>;
  getTransactions(customerId: number): Promise<PointTransaction[]>;
  getLevelBenefits(level: string): Promise<LevelBenefit[]>;
  addLevelBenefit(benefit: InsertLevelBenefit): Promise<LevelBenefit>;
  updateLevelBenefit(id: number, active: boolean): Promise<LevelBenefit>;
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdminPassword(id: number, hashedPassword: string): Promise<Admin>;
  listActiveEvents(): Promise<SpecialEvent[]>;
  getEvent(id: number): Promise<SpecialEvent | undefined>;
  createEvent(event: InsertSpecialEvent): Promise<SpecialEvent>;
  updateEventStatus(id: number, active: boolean): Promise<SpecialEvent>;
  getSpecialOffers(level: string): Promise<SpecialOffer[]>;
  createSpecialOffer(offer: InsertSpecialOffer): Promise<SpecialOffer>;
  updateSpecialOfferStatus(id: number, active: boolean): Promise<SpecialOffer>;
  exportData(): Promise<{
    customers: Customer[];
    transactions: PointTransaction[];
    benefits: LevelBenefit[];
    events: SpecialEvent[];
    offers: SpecialOffer[];
  }>;
  importData(data: {
    customers: Customer[];
    transactions: PointTransaction[];
    benefits: LevelBenefit[];
    events: SpecialEvent[];
    offers: SpecialOffer[];
  }): Promise<void>;
  sessionStore: session.Store;
}

export class PostgresStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const results = await db.select().from(customers).where(eq(customers.id, id));
    return results[0];
  }

  async getCustomerByMobile(mobile: string): Promise<Customer | undefined> {
    const results = await db.select().from(customers).where(eq(customers.mobile, mobile));
    return results[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [result] = await db.insert(customers).values({
      ...customer,
      points: 0,
      level: "Bronze"
    }).returning();
    return result;
  }

  async listCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async deleteCustomer(id: number): Promise<void> {
    // First delete all associated transactions
    await db.delete(pointTransactions).where(eq(pointTransactions.customerId, id));
    // Then delete the customer
    await db.delete(customers).where(eq(customers.id, id));
  }

  async addPoints(transaction: InsertPointTransaction): Promise<Customer> {
    // Get active events to calculate multiplier
    const events = await this.listActiveEvents();
    const multipliedPoints = calculatePointsWithMultiplier(transaction.points, events);

    // Insert the transaction
    await db.insert(pointTransactions).values({
      ...transaction,
      points: multipliedPoints,
      timestamp: new Date()
    });

    // Update customer points
    const customer = await this.getCustomer(transaction.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const newPoints = customer.points + multipliedPoints;
    const newLevel = calculateLevel(newPoints);

    const [updatedCustomer] = await db
      .update(customers)
      .set({
        points: newPoints,
        level: newLevel
      })
      .where(eq(customers.id, customer.id))
      .returning();

    return updatedCustomer;
  }

  async getTransactions(customerId: number): Promise<PointTransaction[]> {
    return await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.customerId, customerId))
      .orderBy(desc(pointTransactions.timestamp));
  }

  async getLevelBenefits(level: string): Promise<LevelBenefit[]> {
    return await db
      .select()
      .from(levelBenefits)
      .where(eq(levelBenefits.level, level))
      .orderBy(desc(levelBenefits.lastUpdated));
  }

  async addLevelBenefit(benefit: InsertLevelBenefit): Promise<LevelBenefit> {
    const [result] = await db
      .insert(levelBenefits)
      .values({
        ...benefit,
        active: true,
        lastUpdated: new Date()
      })
      .returning();
    return result;
  }

  async updateLevelBenefit(id: number, active: boolean): Promise<LevelBenefit> {
    const [result] = await db
      .update(levelBenefits)
      .set({
        active,
        lastUpdated: new Date()
      })
      .where(eq(levelBenefits.id, id))
      .returning();
    return result;
  }

  async getAdmin(id: number): Promise<Admin | undefined> {
    const results = await db.select().from(admins).where(eq(admins.id, id));
    return results[0];
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const results = await db.select().from(admins).where(eq(admins.username, username));
    return results[0];
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [result] = await db.insert(admins).values(admin).returning();
    return result;
  }

  async updateAdminPassword(id: number, hashedPassword: string): Promise<Admin> {
    const [result] = await db
      .update(admins)
      .set({ password: hashedPassword })
      .where(eq(admins.id, id))
      .returning();
    return result;
  }

  async listActiveEvents(): Promise<SpecialEvent[]> {
    return await db
      .select()
      .from(specialEvents)
      .where(eq(specialEvents.active, true))
      .orderBy(desc(specialEvents.startDate));
  }

  async getEvent(id: number): Promise<SpecialEvent | undefined> {
    const results = await db.select().from(specialEvents).where(eq(specialEvents.id, id));
    return results[0];
  }

  async createEvent(event: InsertSpecialEvent): Promise<SpecialEvent> {
    const [result] = await db
      .insert(specialEvents)
      .values({
        ...event,
        active: true
      })
      .returning();
    return result;
  }

  async updateEventStatus(id: number, active: boolean): Promise<SpecialEvent> {
    const [result] = await db
      .update(specialEvents)
      .set({ active })
      .where(eq(specialEvents.id, id))
      .returning();
    return result;
  }

  async getSpecialOffers(level: string): Promise<SpecialOffer[]> {
    const now = new Date();
    return await db
      .select()
      .from(specialOffers)
      .where(eq(specialOffers.level, level))
      .andWhere(eq(specialOffers.active, true))
      .andWhere('valid_until', '>', now);
  }

  async createSpecialOffer(offer: InsertSpecialOffer): Promise<SpecialOffer> {
    const [result] = await db
      .insert(specialOffers)
      .values({
        ...offer,
        active: true
      })
      .returning();
    return result;
  }

  async updateSpecialOfferStatus(id: number, active: boolean): Promise<SpecialOffer> {
    const [result] = await db
      .update(specialOffers)
      .set({ active })
      .where(eq(specialOffers.id, id))
      .returning();
    return result;
  }

  async exportData() {
    return {
      customers: await this.listCustomers(),
      transactions: await db.select().from(pointTransactions),
      benefits: await db.select().from(levelBenefits),
      events: await db.select().from(specialEvents),
      offers: await db.select().from(specialOffers)
    };
  }

  async importData(data: {
    customers: Customer[];
    transactions: PointTransaction[];
    benefits: LevelBenefit[];
    events: SpecialEvent[];
    offers: SpecialOffer[];
  }) {
    // Use a raw SQL connection for bulk operations
    const sql = neon(process.env.DATABASE_URL!);
    try {
      // Start transaction
      await sql`BEGIN`;

      // Clear existing data
      await sql`TRUNCATE customers, point_transactions, level_benefits, special_events, special_offers CASCADE`;

      // Insert new data using prepared statements
      if (data.customers.length) {
        await sql`INSERT INTO customers ${sql(data.customers)}`;
      }
      if (data.transactions.length) {
        await sql`INSERT INTO point_transactions ${sql(data.transactions)}`;
      }
      if (data.benefits.length) {
        await sql`INSERT INTO level_benefits ${sql(data.benefits)}`;
      }
      if (data.events.length) {
        await sql`INSERT INTO special_events ${sql(data.events)}`;
      }
      if (data.offers.length) {
        await sql`INSERT INTO special_offers ${sql(data.offers)}`;
      }

      // Commit transaction
      await sql`COMMIT`;
    } catch (error) {
      // Rollback on error
      await sql`ROLLBACK`;
      throw error;
    }
  }
  async testConnection(): Promise<boolean> {
    try {
      // Test basic CRUD operations

      // 1. Create a test customer
      const testCustomer = await this.createCustomer({
        name: "Test User",
        mobile: "+1234567890"
      });

      // 2. Read the customer
      const retrievedCustomer = await this.getCustomer(testCustomer.id);
      if (!retrievedCustomer) throw new Error("Failed to retrieve test customer");

      // 3. Delete the test customer
      await this.deleteCustomer(testCustomer.id);

      // 4. Verify deletion
      const deletedCustomer = await this.getCustomer(testCustomer.id);
      if (deletedCustomer) throw new Error("Failed to delete test customer");

      return true;
    } catch (error) {
      console.error('Database test failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const storage = new PostgresStorage();