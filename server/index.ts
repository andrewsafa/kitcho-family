import express from "express";
import { log } from "./vite";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { storage } from "./storage";
import path from "path";
import fs from "fs";

// Start-up diagnostic logging
log("=== Server Initialization Started ===");
log(`NODE_ENV: ${process.env.NODE_ENV}`);
log(`PORT: ${process.env.PORT}`);
log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

const app = express();
app.use(express.json());

// Basic health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log(`Error: ${err.message}`);
  res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT) || 5000;
const host = "0.0.0.0";

async function startServer() {
  try {
    // Test database connection
    log("Testing database connection...");
    const dbConnected = await storage.testConnection();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }
    log("Database connection successful");

    // Register API routes first
    log("Registering API routes...");
    const server = await registerRoutes(app);

    if (process.env.NODE_ENV === "production") {
      log("Setting up static file serving for production...");
      const staticPath = path.join(process.cwd(), "dist/public");
      log(`Static path: ${staticPath}`);
      log(`index.html exists: ${fs.existsSync(path.join(staticPath, "index.html"))}`);

      // Serve static files from the Vite build output directory
      app.use(express.static(staticPath));

      // Add catch-all route to serve index.html for client-side routing
      app.get('*', (req, res) => {
        res.sendFile("index.html", { root: staticPath });
      });
    } else {
      log("Setting up Vite middleware for development...");
      await setupVite(app, server);
    }

    server.listen(port, host, () => {
      log("=== Server Started Successfully ===");
      log(`Listening on: http://${host}:${port}`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    }).on('error', (error) => {
      log("=== Server Failed to Start ===");
      log(`Error: ${error.message}`);
      process.exit(1);
    });
  } catch (error) {
    log("=== Server Failed to Start ===");
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

startServer();