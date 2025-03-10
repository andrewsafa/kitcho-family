import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialOfferSchema, insertPartnerSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, requireAdmin, hashPassword, comparePasswords } from "./auth";
import { backupScheduler } from "./backup-scheduler";

export async function registerRoutes(app: Express) {
  // Set up authentication first
  setupAuth(app);

  // Basic health check endpoint
  app.get("/health", async (_req, res) => {
    try {
      await storage.listCustomers();
      res.json({ 
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: !!process.env.DATABASE_URL,
        readiness: "ready"
      });
    } catch (error) {
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        readiness: "not_ready"
      });
    }
  });

  // Initialize verification codes and passwords for existing customers
  try {
    await storage.ensureVerificationCodes();
    await storage.ensureCustomerPasswords();
  } catch (error) {
    console.error("Error initializing customer data:", error);
  }

  // Return the HTTP server
  return createServer(app);
}