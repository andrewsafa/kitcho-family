import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  points: integer("points").notNull().default(0),
  level: text("level").notNull().default("Bronze"),
});

export const pointTransactions = pgTable("point_transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const levelBenefits = pgTable("level_benefits", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  benefit: text("benefit").notNull(),
  active: boolean("active").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  mobile: true,
}).extend({
  mobile: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile number format"),
  name: z.string().min(2, "Name must be at least 2 characters")
});

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).pick({
  customerId: true,
  points: true,
  description: true,
});

export const insertLevelBenefitSchema = createInsertSchema(levelBenefits).pick({
  level: true,
  benefit: true,
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
export type LevelBenefit = typeof levelBenefits.$inferSelect;
export type InsertLevelBenefit = z.infer<typeof insertLevelBenefitSchema>;

export const LOYALTY_LEVELS = {
  Bronze: { min: 0, max: 100000 },
  Silver: { min: 100001, max: 300000 },
  Gold: { min: 300001, max: 500000 },
  Diamond: { min: 500001, max: Infinity }
} as const;

export type LoyaltyLevel = keyof typeof LOYALTY_LEVELS;

export function calculateLevel(points: number): LoyaltyLevel {
  for (const [level, range] of Object.entries(LOYALTY_LEVELS)) {
    if (points >= range.min && points <= range.max) {
      return level as LoyaltyLevel;
    }
  }
  return "Bronze";
}