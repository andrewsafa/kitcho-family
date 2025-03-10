import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
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

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handling request: ${status} - ${message}`);
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT from environment variable with fallback
    const port = Number(process.env.PORT) || 5000;

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server environment: ${app.get('env')}`);
      log(`Server listening on port ${port}`);
      log(`Database connection: ${process.env.DATABASE_URL ? 'Configured' : 'Missing'}`);
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();