import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { setupAuth, requireAdmin } from "./auth";
import { log } from "./vite";
import { 
  insertCustomerSchema,
  insertPointTransactionSchema,
  insertLevelBenefitSchema,
  insertSpecialEventSchema,
  insertSpecialOfferSchema
} from "@shared/schema";

export async function registerRoutes(app: Express) {
  log("Setting up routes...");

  // Set up authentication first
  setupAuth(app);

  // Customer routes
  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(Number(req.params.id));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Points transaction routes
  app.post("/api/points", requireAdmin, async (req, res) => {
    try {
      const transactionData = insertPointTransactionSchema.parse(req.body);
      const customer = await storage.addPoints(transactionData);
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/customers/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions(Number(req.params.id));
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Level benefits routes
  app.post("/api/benefits", requireAdmin, async (req, res) => {
    try {
      const benefitData = insertLevelBenefitSchema.parse(req.body);
      const benefit = await storage.addLevelBenefit(benefitData);
      res.status(201).json(benefit);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/benefits/:level", async (req, res) => {
    try {
      const benefits = await storage.getLevelBenefits(req.params.level);
      res.json(benefits);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Special events routes
  app.post("/api/events", requireAdmin, async (req, res) => {
    try {
      const eventData = insertSpecialEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.listActiveEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Special offers routes
  app.post("/api/offers", requireAdmin, async (req, res) => {
    try {
      const offerData = insertSpecialOfferSchema.parse(req.body);
      const offer = await storage.createSpecialOffer(offerData);
      res.status(201).json(offer);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/offers/:level", async (req, res) => {
    try {
      const offers = await storage.getSpecialOffers(req.params.level);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Enhanced health check endpoint with improved error handling
  app.get("/health", async (_req, res) => {
    try {
      // Test database connection
      await storage.testConnection();

      res.json({ 
        status: "ok",
        time: new Date().toISOString()
      });
    } catch (error) {
      log(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      res.status(503).json({ 
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return createServer(app);
}