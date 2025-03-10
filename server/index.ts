import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

log("=== Starting Server ===");

// Add detailed request logging
app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});

(async () => {
  try {
    // Test database connection first
    log("Testing database connection...");
    const dbStatus = await storage.testConnection();
    if (!dbStatus) {
      throw new Error("Database connection test failed");
    }
    log("Database connection successful");

    // Check and create admin if needed
    log("Checking admin user...");
    const existingAdmin = await storage.getAdminByUsername("admin");
    if (!existingAdmin) {
      log("Creating initial admin user...");
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const passwordBuf = (await scryptAsync("admin123", salt, 64)) as Buffer;
      const hashedPassword = `${passwordBuf.toString("hex")}.${salt}`;

      await storage.createAdmin({
        username: "admin",
        password: hashedPassword
      });
      log("Initial admin user created");
    }

    // Basic server setup
    const server = await registerRoutes(app);

    // Simple error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      log(`Error: ${err.message}`);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT from environment variable with fallback
    const port = Number(process.env.PORT) || 5000;
    const host = "0.0.0.0";

    server.listen(port, host, () => {
      log("=== Server Started Successfully ===");
      log(`Environment: ${process.env.NODE_ENV}`);
      log(`Port: ${port}`);
      log(`Host: ${host}`);
      log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not Connected'}`);
      log(`Session Secret: ${process.env.SESSION_SECRET ? 'Configured' : 'Not Configured'}`);
    });
  } catch (error) {
    log("=== Server Failed to Start ===");
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();