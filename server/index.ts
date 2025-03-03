import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Set development mode
process.env.NODE_ENV = "development";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
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
    log("Successfully connected to database");

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

    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Always use setupVite in development
    await setupVite(app, server);

    // Start server
    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();