import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { setupAuth, requireAdmin, comparePasswords } from "./auth";
import { log } from "./vite";
import { 
  insertCustomerSchema,
  insertPointTransactionSchema,
  insertLevelBenefitSchema,
  insertSpecialEventSchema,
  insertSpecialOfferSchema
} from "@shared/schema";
import session from "express-session";

// Add type definition for customer session
declare module "express-session" {
  interface SessionData {
    customerId?: number;
    adminId?: number;
  }
}

export async function registerRoutes(app: Express) {
  log("Setting up routes...");

  // Set up authentication first
  setupAuth(app);

  // Add customer authentication routes
  app.post("/api/customer/login", async (req, res) => {
    try {
      const { mobile, password } = req.body;
      log(`Attempting login for mobile: ${mobile}`);

      // Input validation
      if (!mobile || !password) {
        return res.status(400).json({ error: "Mobile and password are required" });
      }

      // Find customer
      const customer = await storage.getCustomerByMobile(mobile);
      if (!customer) {
        log("Login failed: Customer not found");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!customer.password) {
        log("Login failed: Password not set");
        return res.status(401).json({ error: "Password not set for this account" });
      }

      // Verify password
      const passwordValid = await comparePasswords(password, customer.password);
      if (!passwordValid) {
        log("Login failed: Invalid password");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      req.session.customerId = customer.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            log("Error saving session:", err);
            reject(err);
          } else {
            log("Session saved successfully");
            resolve();
          }
        });
      });

      log("Login successful");
      res.json({
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        points: customer.points,
        level: customer.level
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Customer routes
  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      log("Creating new customer:", customerData.mobile);

      const customer = await storage.createCustomer(customerData);

      // Set session after creating customer
      req.session.customerId = customer.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            log("Error saving session:", err);
            reject(err);
          } else {
            log("Session saved successfully");
            resolve();
          }
        });
      });

      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.get("/api/customer/me", async (req, res) => {
    try {
      if (!req.session.customerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const customer = await storage.getCustomer(req.session.customerId);
      if (!customer) {
        return res.status(401).json({ error: "Customer not found" });
      }

      res.json({
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        points: customer.points,
        level: customer.level
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/customer/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
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

  // Customer listing endpoint
  app.get("/api/customers", requireAdmin, async (_req, res) => {
    try {
      const customers = await storage.listCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Customer deletion endpoint
  app.delete("/api/customers/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCustomer(Number(req.params.id));
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      log(`Error deleting customer: ${error instanceof Error ? error.message : String(error)}`);
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

  // Add backup endpoint
  app.get("/api/backup", requireAdmin, async (_req, res) => {
    try {
      const data = await storage.exportData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/restore", requireAdmin, async (req, res) => {
    try {
      await storage.importData(req.body);
      res.json({ message: "Data restored successfully" });
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