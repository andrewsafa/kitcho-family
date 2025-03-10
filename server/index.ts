import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced startup logging
log("Starting Kitcho Family server...");
log(`Environment: ${process.env.NODE_ENV}`);
log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
log(`Port configured: ${process.env.PORT || '5000 (default)'}`);

// Add detailed request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  log('=== Uncaught Exception ===');
  log(`Error: ${error.message}`);
  log(`Stack: ${error.stack}`);
  log('==========================');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('=== Unhandled Promise Rejection ===');
  log(`Reason: ${reason}`);
  log('==================================');
  process.exit(1);
});

(async () => {
  try {
    log("Initializing database connection...");
    // Check if admin exists before creating
    const existingAdmin = await storage.getAdminByUsername("admin");

    if (!existingAdmin) {
      log("Creating initial admin user...");
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

    log("Setting up routes...");
    const server = await registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handling request: ${status} - ${message}`);
      if (err.stack) {
        log(`Error stack trace: ${err.stack}`);
      }
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    // Use PORT from environment variable with fallback
    const port = Number(process.env.PORT) || 5000;
    const host = "0.0.0.0";

    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log("=== Server Started Successfully ===");
      log(`Environment: ${app.get('env')}`);
      log(`Listening on: http://${host}:${port}`);
      log(`Database connection: ${process.env.DATABASE_URL ? 'Configured' : 'Missing'}`);
      log("================================");
    });
  } catch (error) {
    log("=== Server Failed to Start ===");
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
    log("============================");
    process.exit(1);
  }
})();