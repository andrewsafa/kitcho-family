import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
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

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;

export const LOYALTY_LEVELS = {
  Bronze: { min: 0, max: 999 },
  Silver: { min: 1000, max: 4999 },
  Gold: { min: 5000, max: 9999 },
  Platinum: { min: 10000, max: Infinity }
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
