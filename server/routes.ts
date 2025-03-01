import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialEventSchema, insertSpecialOfferSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, requireAdmin, hashPassword, comparePasswords } from "./auth";
import { backupScheduler } from "./backup-scheduler";

export async function registerRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  // Customer routes
  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const existing = await storage.getCustomerByMobile(customerData.mobile);
      if (existing) {
        return res.status(409).json({ message: "Mobile number already registered" });
      }
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Add delete customer endpoint
  app.delete("/api/customers/:id", requireAdmin, async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      await storage.deleteCustomer(customerId);
      res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  app.get("/api/customers/mobile/:mobile", async (req, res) => {
    const customer = await storage.getCustomerByMobile(req.params.mobile);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  });

  app.get("/api/customers", requireAdmin, async (_req, res) => {
    const customers = await storage.listCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id/transactions", async (req, res) => {
    const transactions = await storage.getTransactions(parseInt(req.params.id));
    res.json(transactions);
  });

  // Level Benefits routes
  app.get("/api/benefits/:level", async (req, res) => {
    const benefits = await storage.getLevelBenefits(req.params.level);
    res.json(benefits);
  });

  app.post("/api/benefits", requireAdmin, async (req, res) => {
    try {
      const benefitData = insertLevelBenefitSchema.parse(req.body);
      const benefit = await storage.addLevelBenefit(benefitData);
      res.status(201).json(benefit);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/benefits/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const benefit = await storage.updateLevelBenefit(id, active);
      res.json(benefit);
    } catch (error) {
      res.status(404).json({ message: "Benefit not found" });
    }
  });

  // Points routes
  app.post("/api/points", requireAdmin, async (req, res) => {
    try {
      const transactionData = insertPointTransactionSchema.parse(req.body);
      const customer = await storage.addPoints(transactionData);
      res.json(customer);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Add delete points endpoint
  app.post("/api/points/delete", requireAdmin, async (req, res) => {
    try {
      const { customerId, points, description } = req.body;
      if (!customerId || !points || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const transactionData = {
        customerId,
        points: -Math.abs(points), // Ensure points are negative for deletion
        description: `Points Deleted: ${description}`
      };

      const customer = await storage.addPoints(transactionData);
      res.json(customer);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Special Events routes
  app.get("/api/events", async (_req, res) => {
    const events = await storage.listActiveEvents();
    res.json(events);
  });

  app.post("/api/events", requireAdmin, async (req, res) => {
    try {
      const eventData = insertSpecialEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/events/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const event = await storage.updateEventStatus(id, active);
      res.json(event);
    } catch (error) {
      res.status(404).json({ message: "Event not found" });
    }
  });

  // Special Offers routes
  app.get("/api/offers/:level", async (req, res) => {
    const offers = await storage.getSpecialOffers(req.params.level);
    res.json(offers);
  });

  app.post("/api/offers", requireAdmin, async (req, res) => {
    try {
      const offerData = insertSpecialOfferSchema.parse(req.body);
      const offer = await storage.createSpecialOffer(offerData);
      res.status(201).json(offer);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const offer = await storage.updateSpecialOfferStatus(id, active);
      res.json(offer);
    } catch (error) {
      res.status(404).json({ message: "Special offer not found" });
    }
  });

  app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!req.session.adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getAdmin(req.session.adminId);
      if (!admin || !(await comparePasswords(currentPassword, admin.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      const updatedAdmin = await storage.updateAdminPassword(admin.id, hashedPassword);
      res.json(updatedAdmin);
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Backup endpoint
  app.get("/api/backup", requireAdmin, async (_req, res) => {
    try {
      const data = await storage.exportData();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=kitcho-family-backup.json');
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  // Restore endpoint
  app.post("/api/restore", requireAdmin, async (req, res) => {
    try {
      const data = req.body;
      // Basic validation of the backup file structure
      if (!data.customers || !Array.isArray(data.customers) ||
          !data.transactions || !Array.isArray(data.transactions) ||
          !data.benefits || !Array.isArray(data.benefits) ||
          !data.events || !Array.isArray(data.events) ||
          !data.offers || !Array.isArray(data.offers)) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      await storage.importData(data);
      res.json({ message: "Data restored successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to restore data" });
    }
  });

  // Backup Scheduling endpoints
  app.get("/api/backup/config", requireAdmin, async (_req, res) => {
    const config = backupScheduler.getConfig();
    res.json(config);
  });

  app.post("/api/backup/config", requireAdmin, async (req, res) => {
    try {
      await backupScheduler.configure(req.body);
      res.json({ success: true, config: backupScheduler.getConfig() });
    } catch (error) {
      res.status(500).json({ message: "Failed to update backup configuration" });
    }
  });

  app.get("/api/backup/history", requireAdmin, async (_req, res) => {
    const history = backupScheduler.getHistory();
    res.json(history);
  });

  app.post("/api/backup/run", requireAdmin, async (_req, res) => {
    try {
      const result = await backupScheduler.createBackup();
      if (result.success) {
        res.json({ message: "Backup created successfully", filename: result.filename });
      } else {
        res.status(500).json({ message: `Backup failed: ${result.error}` });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  return createServer(app);
}