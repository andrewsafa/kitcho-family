import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

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

export const specialEvents = pgTable("special_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  multiplier: integer("multiplier").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").notNull().default(true),
});

export const specialOffers = pgTable("special_offers", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  active: boolean("active").notNull().default(true),
  imagePath: text("image_path"), // Added imagePath field
});

export const storeSubmissions = pgTable("store_submissions", {
  id: serial("id").primaryKey(),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description").notNull(),
  privacyPolicyUrl: text("privacy_policy_url").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  iconPath: text("icon_path"),
  featureGraphicPath: text("feature_graphic_path"),
  screenshotPaths: text("screenshot_paths").array(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

export const insertSpecialEventSchema = createInsertSchema(specialEvents).pick({
  name: true,
  description: true,
  multiplier: true,
  startDate: true,
  endDate: true,
}).extend({
  multiplier: z.number().min(1, "Multiplier must be at least 1"),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
});

export const insertSpecialOfferSchema = createInsertSchema(specialOffers).pick({
  level: true,
  title: true,
  description: true,
  validUntil: true,
  imagePath: true, // Added imagePath field
}).extend({
  validUntil: z.string().transform(str => new Date(str)),
  imagePath: z.string().optional(),
});

export const insertStoreSubmissionSchema = createInsertSchema(storeSubmissions).pick({
  shortDescription: true,
  fullDescription: true,
  privacyPolicyUrl: true,
  contactEmail: true,
  contactPhone: true,
  iconPath: true,
  featureGraphicPath: true,
  screenshotPaths: true,
}).extend({
  shortDescription: z.string().min(10, "Short description must be at least 10 characters"),
  fullDescription: z.string().min(50, "Full description must be at least 50 characters"),
  privacyPolicyUrl: z.string().url("Invalid privacy policy URL"),
  contactEmail: z.string().email("Invalid contact email"),
  contactPhone: z.string().optional(),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
export type LevelBenefit = typeof levelBenefits.$inferSelect;
export type InsertLevelBenefit = z.infer<typeof insertLevelBenefitSchema>;
export type SpecialEvent = typeof specialEvents.$inferSelect;
export type InsertSpecialEvent = z.infer<typeof insertSpecialEventSchema>;
export type SpecialOffer = typeof specialOffers.$inferSelect;
export type InsertSpecialOffer = z.infer<typeof insertSpecialOfferSchema>;
export type StoreSubmission = typeof storeSubmissions.$inferSelect;
export type InsertStoreSubmission = z.infer<typeof insertStoreSubmissionSchema>;

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

export function calculatePointsWithMultiplier(basePoints: number, events: SpecialEvent[]): number {
  const now = new Date();
  const activeMultipliers = events
    .filter(event =>
      event.active &&
      now >= event.startDate &&
      now <= event.endDate
    )
    .map(event => event.multiplier);

  // If no active multipliers, return base points
  if (activeMultipliers.length === 0) return basePoints;

  // Use the highest multiplier
  const maxMultiplier = Math.max(...activeMultipliers);
  return basePoints * maxMultiplier;
}