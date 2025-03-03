import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

(async () => {
  try {
    // Check database connection first
    const dbConnected = await storage.testConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }
    log("Successfully connected to PostgreSQL database");

    // Check if admin exists before creating
    const existingAdmin = await storage.getAdminByUsername("admin");

    if (!existingAdmin) {
      // Create initial admin user only if it doesn't exist
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const passwordBuf = (await scryptAsync("admin123", salt, 64)) as Buffer;
      const hashedPassword = `${passwordBuf.toString("hex")}.${salt}`;

      await storage.createAdmin({
        username: "admin",
        password: hashedPassword
      });

      log("Created initial admin user (username: admin, password: admin123)");
    } else {
      log("Admin user already exists, skipping creation");
    }

    // Create server first
    const server = await registerRoutes(app);

    // Set up Vite middleware
    await setupVite(app, server);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Start the server
    server.listen(5000, "0.0.0.0", () => {
      log("Server started on http://0.0.0.0:5000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();