import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialOfferSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, requireAdmin, hashPassword, comparePasswords } from "./auth";
import { backupScheduler } from "./backup-scheduler";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
// Add regular fs for createReadStream
import * as fsSync from "fs";

const multerStorage = multer.diskStorage({
  destination: "./store-assets",
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: multerStorage });

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

  // Add new DELETE endpoint for benefits
  app.delete("/api/benefits/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLevelBenefit(id);
      res.json({ message: "Benefit deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete benefit" });
    }
  });

  // Update the existing PATCH endpoint for benefits
  app.patch("/api/benefits/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { level, benefit, active } = req.body;

      // Validate the update data
      const updateData = {
        ...(level && { level }),
        ...(benefit && { benefit }),
        ...(typeof active !== 'undefined' && { active })
      };

      const updatedBenefit = await storage.updateLevelBenefit(id, updateData);
      res.json(updatedBenefit);
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

  // Add DELETE endpoint for offers
  app.delete("/api/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSpecialOffer(id);
      res.json({ message: "Offer deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete offer" });
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

  // Add new store submission endpoint
  app.post("/api/store-submission", upload.fields([
    { name: 'icon', maxCount: 1 },
    { name: 'featureGraphic', maxCount: 1 },
    { name: 'screenshots', maxCount: 8 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const storeData = req.body;

      // Ensure store-assets directory exists
      await fs.mkdir("./store-assets", { recursive: true });

      // Validate and process icon
      if (files.icon?.[0]) {
        const iconBuffer = await sharp(files.icon[0].path)
          .resize(512, 512)
          .png()
          .toBuffer();
        await fs.writeFile(`./store-assets/icon.png`, iconBuffer);
      }

      // Validate and process feature graphic
      if (files.featureGraphic?.[0]) {
        const featureBuffer = await sharp(files.featureGraphic[0].path)
          .resize(1024, 500)
          .png()
          .toBuffer();
        await fs.writeFile(`./store-assets/feature.png`, featureBuffer);
      }

      // Process screenshots
      if (files.screenshots) {
        await Promise.all(files.screenshots.map(async (screenshot, index) => {
          const screenshotBuffer = await sharp(screenshot.path)
            .png()
            .toBuffer();
          await fs.writeFile(`./store-assets/screenshot-${index + 1}.png`, screenshotBuffer);
        }));
      }

      // Store submission data
      await storage.createStoreSubmission({
        shortDescription: storeData.shortDescription,
        fullDescription: storeData.fullDescription,
        privacyPolicyUrl: storeData.privacyPolicyUrl,
        contactEmail: storeData.contactEmail,
        contactPhone: storeData.contactPhone,
        iconPath: files.icon?.[0] ? 'icon.png' : null,
        featureGraphicPath: files.featureGraphic?.[0] ? 'feature.png' : null,
        screenshotPaths: files.screenshots?.map((_, index) => `screenshot-${index + 1}.png`) || [],
        status: 'pending',
        createdAt: new Date()
      });

      res.status(201).json({
        message: "Store submission prepared successfully",
        status: "pending"
      });
    } catch (error) {
      console.error('Store submission error:', error);
      res.status(500).json({
        message: "Failed to process store submission",
        error: error.message
      });
    }
  });

  // Backup download endpoint - Fixed to use fs sync for streaming
  app.get("/api/backup/download/:filename", requireAdmin, async (req, res) => {
    try {
      const backupConfig = backupScheduler.getConfig();
      const filename = req.params.filename;
      const filepath = path.join(backupConfig.backupDir, filename);

      // Log the file path for debugging
      console.log(`Attempting to download: ${filepath}`);

      // Validate filename to prevent directory traversal
      if (filename.includes('..') || !filename.endsWith('.json')) {
        return res.status(400).json({ message: "Invalid backup filename" });
      }

      // Check if file exists
      try {
        await fs.access(filepath);
        console.log(`File exists: ${filepath}`);
      } catch (error) {
        console.error(`File not found: ${filepath}`, error);
        return res.status(404).json({ message: "Backup file not found" });
      }

      // Set headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      try {
        // Read file content and send it directly
        const fileContent = await fs.readFile(filepath, 'utf-8');
        res.send(fileContent);
      } catch (error) {
        console.error(`Error reading file: ${filepath}`, error);
        res.status(500).json({ message: `Failed to read backup file: ${error.message}` });
      }
    } catch (error) {
      console.error('Backup download error:', error);
      res.status(500).json({ message: `Failed to download backup file: ${error.message}` });
    }
  });

  return createServer(app);
}