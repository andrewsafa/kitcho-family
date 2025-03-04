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
  specialOffers,
  type StoreSubmission,
  type InsertStoreSubmission,
  storeSubmissions
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, gt, sql } from "drizzle-orm";
import connectPg from 'connect-pg-simple';
import session from 'express-session';

const PostgresSessionStore = connectPg(session);

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
  updateLevelBenefit(id: number, updates: Partial<InsertLevelBenefit & { active: boolean }>): Promise<LevelBenefit>;
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
  updateSpecialOffer(id: number, updates: Partial<InsertSpecialOffer & { active: boolean }>): Promise<SpecialOffer>;
  deleteSpecialOffer(id: number): Promise<void>;
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
  testConnection(): Promise<boolean>;
  createStoreSubmission(submission: InsertStoreSubmission): Promise<StoreSubmission>;
  getStoreSubmission(id: number): Promise<StoreSubmission | undefined>;
  listStoreSubmissions(): Promise<StoreSubmission[]>;
  deleteStoreSubmission(id: number): Promise<void>;
  updateStoreSubmission(id: number, submission: Partial<InsertStoreSubmission>): Promise<StoreSubmission>;
  deleteLevelBenefit(id: number): Promise<void>;
}

function generateVerificationCode(length = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let code = '';
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
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
      level: "Bronze",
      verificationCode: generateVerificationCode() 
    }).returning();
    return result;
  }

  // Add defensive code for existing customers without verification codes
  async ensureVerificationCodes(): Promise<void> {
    try {
      // Get all customers without verification codes
      const results = await db
        .select()
        .from(customers)
        .where(sql`verification_code IS NULL`);

      // Generate and update verification codes for these customers
      for (const customer of results) {
        await db
          .update(customers)
          .set({ verificationCode: generateVerificationCode() })
          .where(eq(customers.id, customer.id));
      }

      console.log(`Updated verification codes for ${results.length} customers`);
    } catch (error) {
      console.error("Error ensuring verification codes:", error);
    }
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

  async updateLevelBenefit(
    id: number, 
    updates: Partial<InsertLevelBenefit & { active: boolean }>
  ): Promise<LevelBenefit> {
    const [result] = await db
      .update(levelBenefits)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(levelBenefits.id, id))
      .returning();

    if (!result) {
      throw new Error("Benefit not found");
    }

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
      .where(
        and(
          eq(specialOffers.level, level),
          eq(specialOffers.active, true),
          gt(specialOffers.validUntil, now)
        )
      );
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

  // Add new method to update special offers with image support
  async updateSpecialOffer(
    id: number, 
    updates: Partial<InsertSpecialOffer & { active: boolean }>
  ): Promise<SpecialOffer> {
    const [result] = await db
      .update(specialOffers)
      .set(updates)
      .where(eq(specialOffers.id, id))
      .returning();

    if (!result) {
      throw new Error("Special offer not found");
    }

    return result;
  }

  async deleteSpecialOffer(id: number): Promise<void> {
    await db.delete(specialOffers).where(eq(specialOffers.id, id));
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
    // Use a transaction for bulk import
    await db.transaction(async (tx) => {
      // Clear existing data
      await tx.delete(specialOffers);
      await tx.delete(specialEvents);
      await tx.delete(levelBenefits);
      await tx.delete(pointTransactions);
      await tx.delete(customers);

      // Import new data
      if (data.customers.length) await tx.insert(customers).values(data.customers);
      if (data.transactions.length) await tx.insert(pointTransactions).values(data.transactions);
      if (data.benefits.length) await tx.insert(levelBenefits).values(data.benefits);
      if (data.events.length) await tx.insert(specialEvents).values(data.events);
      if (data.offers.length) await tx.insert(specialOffers).values(data.offers);
    });
  }
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing database connection...');

      // Test basic query
      const result = await pool.query('SELECT 1 as test');
      console.log('Basic query test passed:', result.rows[0].test === 1);

      // Test schema access
      const customersResult = await db.select().from(customers).limit(1);
      console.log('Schema access test passed, can query customers table');

      // Test transaction
      await db.transaction(async (tx) => {
        // Create test customer
        const [testCustomer] = await tx
          .insert(customers)
          .values({
            name: "Test User",
            mobile: "+1234567890",
            points: 0,
            level: "Bronze"
          })
          .returning();
        console.log('Transaction test - Created test customer:', testCustomer.id);

        // Clean up test data
        await tx.delete(customers).where(eq(customers.id, testCustomer.id));
        console.log('Transaction test - Cleaned up test customer');
      });

      console.log('All database tests passed successfully');
      return true;
    } catch (error) {
      console.error('Database test failed:', error);
      return false;
    }
  }
  async createStoreSubmission(submission: InsertStoreSubmission): Promise<StoreSubmission> {
    const [result] = await db
      .insert(storeSubmissions)
      .values(submission)
      .returning();
    return result;
  }

  async getStoreSubmission(id: number): Promise<StoreSubmission | undefined> {
    const results = await db
      .select()
      .from(storeSubmissions)
      .where(eq(storeSubmissions.id, id));
    return results[0];
  }

  async listStoreSubmissions(): Promise<StoreSubmission[]> {
    return await db
      .select()
      .from(storeSubmissions)
      .orderBy(desc(storeSubmissions.createdAt));
  }
  async deleteStoreSubmission(id: number): Promise<void> {
    await db
      .delete(storeSubmissions)
      .where(eq(storeSubmissions.id, id));
  }

  async updateStoreSubmission(id: number, submission: Partial<InsertStoreSubmission>): Promise<StoreSubmission> {
    const [result] = await db
      .update(storeSubmissions)
      .set(submission)
      .where(eq(storeSubmissions.id, id))
      .returning();
    return result;
  }
  async deleteLevelBenefit(id: number): Promise<void> {
    await db.delete(levelBenefits).where(eq(levelBenefits.id, id));
  }
}

// Export a singleton instance
export const storage = new PostgresStorage();