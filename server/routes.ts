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
// Add regular fs for createReadStream and directory operations
import * as fsSync from "fs";
import express from "express";

// Create all necessary directories with proper error handling
async function ensureDirectoriesExist() {
  const dirs = [
    "./public",
    "./public/assets",
    "./public/assets/benefits",
    "./public/assets/offers",
    "./store-assets"
  ];

  for (const dir of dirs) {
    try {
      if (!fsSync.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        await fs.mkdir(dir, { recursive: true });
      }
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
}

// Ensure directories exist before configuring multer
ensureDirectoriesExist().catch(err => {
  console.error("Failed to create required directories:", err);
});

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use different destinations based on upload type
    let uploadPath;
    if (req.path.includes('/benefits/image')) {
      uploadPath = "./public/assets/benefits";
    } else if (req.path.includes('/offers/image')) {
      uploadPath = "./public/assets/offers";
    } else {
      uploadPath = "./store-assets";
    }

    // Ensure the directory exists synchronously before saving file
    if (!fsSync.existsSync(uploadPath)) {
      try {
        fsSync.mkdirSync(uploadPath, { recursive: true });
        console.log(`Created directory: ${uploadPath}`);
      } catch (err) {
        console.error(`Error creating ${uploadPath}:`, err);
        return cb(new Error(`Cannot create upload directory: ${err.message}`), "");
      }
    }

    console.log(`Using upload path: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    console.log(`Generated filename: ${uniqueFilename}`);
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

export async function registerRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  // Serve static files from public directory
  // Add detailed logging for static file requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/')) {
      console.log(`Static file request: ${req.path}`);
    }
    next();
  });

  // Improved static file serving with proper content types
  app.use('/assets', express.static('public/assets', {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      }
    }
  }));

  // Diagnostic route for testing image serving
  app.get("/api/test-image-paths", async (_req, res) => {
    try {
      // Create a test image if it doesn't exist
      const testImagePath = "./public/assets/test-image.png";
      if (!fsSync.existsSync(testImagePath)) {
        // Create a simple colored square as a test image
        await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
          }
        })
        .png()
        .toFile(testImagePath);
        console.log("Created test image at:", testImagePath);
      }

      // Log all existing assets directories and their contents
      const benefitsDir = "./public/assets/benefits";
      const offersDir = "./public/assets/offers";

      console.log("Assets directory structure:");
      if (fsSync.existsSync(benefitsDir)) {
        const benefitFiles = fsSync.readdirSync(benefitsDir);
        console.log(`Benefits directory (${benefitsDir}):`, benefitFiles);
      } else {
        console.log("Benefits directory does not exist");
      }

      if (fsSync.existsSync(offersDir)) {
        const offerFiles = fsSync.readdirSync(offersDir);
        console.log(`Offers directory (${offersDir}):`, offerFiles);
      } else {
        console.log("Offers directory does not exist");
      }

      res.json({
        message: "Image diagnostics",
        testImageUrl: "/assets/test-image.png",
        diagnosticPageUrl: "/test.html",
        assetsDirectory: {
          path: "public/assets",
          exists: fsSync.existsSync("./public/assets"),
        },
        benefitsDirectory: {
          path: "public/assets/benefits",
          exists: fsSync.existsSync(benefitsDir),
          files: fsSync.existsSync(benefitsDir) ? fsSync.readdirSync(benefitsDir) : []
        },
        offersDirectory: {
          path: "public/assets/offers",
          exists: fsSync.existsSync(offersDir),
          files: fsSync.existsSync(offersDir) ? fsSync.readdirSync(offersDir) : []
        }
      });
    } catch (error) {
      console.error("Error in image diagnostics:", error);
      res.status(500).json({
        message: "Error generating diagnostics",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

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

  // Upload image for benefit
  app.post("/api/benefits/image", requireAdmin, upload.single('image'), async (req, res) => {
    console.log("Benefit image upload started");

    try {
      if (!req.file) {
        console.error("No image file provided");
        return res.status(400).json({ message: "No image file provided" });
      }

      console.log("File uploaded:", req.file.path);

      // Create output directory if it doesn't exist
      const publicDir = "./public";
      const assetsDir = path.join(publicDir, "assets");
      const benefitsDir = path.join(assetsDir, "benefits");

      await fs.mkdir(benefitsDir, { recursive: true });
      console.log("Directories created or verified");

      // Process image - resize to small size for benefits
      const outputFilename = path.basename(req.file.path);
      const outputPath = path.join(benefitsDir, outputFilename);
      const imagePath = `/assets/benefits/${outputFilename}`;

      console.log("Processing image, output path:", outputPath);

      // Important: Make sure input and output paths are different to avoid errors
      const buffer = await sharp(req.file.path)
        .resize(100, 100) // Small size for benefits
        .toBuffer();

      await fs.writeFile(outputPath, buffer);

      console.log("Image processed successfully");

      // Remove the original uploaded file if it's in a different location
      if (req.file.path !== outputPath) {
        await fs.unlink(req.file.path).catch(err => {
          console.warn("Warning: Could not delete original file:", err);
        });
        console.log("Original file removed");
      }

      res.json({ imagePath });
    } catch (error) {
      console.error("Error processing benefit image:", error);
      res.status(500).json({ 
        message: "Failed to process image", 
        error: error instanceof Error ? error.message : String(error) 
      });
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
      const { level, benefit, active, imagePath } = req.body;

      // Validate the update data
      const updateData = {
        ...(level && { level }),
        ...(benefit && { benefit }),
        ...(typeof active !== 'undefined' && { active }),
        ...(imagePath && { imagePath })
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

  // Upload image for offer
  app.post("/api/offers/image", requireAdmin, upload.single('image'), async (req, res) => {
    console.log("Offer image upload started");

    try {
      if (!req.file) {
        console.error("No image file provided");
        return res.status(400).json({ message: "No image file provided" });
      }

      console.log("File uploaded:", req.file.path);

      // Create output directory if it doesn't exist
      const publicDir = "./public";
      const assetsDir = path.join(publicDir, "assets");
      const offersDir = path.join(assetsDir, "offers");

      await fs.mkdir(offersDir, { recursive: true });
      console.log("Directories created or verified");

      // Process image - resize to medium size for offers
      const outputFilename = path.basename(req.file.path);
      const outputPath = path.join(offersDir, outputFilename);
      const imagePath = `/assets/offers/${outputFilename}`;

      console.log("Processing image, output path:", outputPath);

      // Important: Make sure input and output paths are different to avoid errors
      const buffer = await sharp(req.file.path)
        .resize(300, 200) // Medium size for offers
        .toBuffer();

      await fs.writeFile(outputPath, buffer);

      console.log("Image processed successfully");

      // Remove the original uploaded file if it's in a different location
      if (req.file.path !== outputPath) {
        await fs.unlink(req.file.path).catch(err => {
          console.warn("Warning: Could not delete original file:", err);
        });
        console.log("Original file removed");
      }

      res.json({ imagePath });
    } catch (error) {
      console.error("Error processing offer image:", error);
      res.status(500).json({ 
        message: "Failed to process image", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.patch("/api/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active, imagePath } = req.body;

      const updateData = {
        ...(typeof active !== 'undefined' && { active }),
        ...(imagePath && { imagePath })
      };

      const offer = await storage.updateSpecialOffer(id, updateData);
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
      });

      res.status(201).json({
        message: "Store submission prepared successfully",
        status: "pending"
      });
    } catch (error) {
      console.error('Store submission error:', error);
      res.status(500).json({
        message: "Failed to process store submission",
        error: error instanceof Error ? error.message : String(error)
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
        res.status(500).json({ message: `Failed to read backup file: ${error instanceof Error ? error.message : String(error)}` });
      }
    } catch (error) {
      console.error('Backup download error:', error);
      res.status(500).json({ message: `Failed to download backup file: ${error instanceof Error ? error.message : String(error)}` });
    }
  });

  // Add a new partner verification endpoint
  app.get("/api/partner/verify/:mobile", async (req, res) => {
    try {
      const mobile = req.params.mobile;
      const customer = await storage.getCustomerByMobile(mobile);

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Return only the necessary information for verification
      // Excludes sensitive details but includes loyalty information
      res.json({
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        level: customer.level,
        points: customer.points
      });
    } catch (error) {
      console.error("Partner verification error:", error);
      res.status(500).json({ 
        message: "Failed to verify customer",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return createServer(app);
}