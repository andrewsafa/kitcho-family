import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { log } from "./vite";

export async function registerRoutes(app: Express) {
  log("Setting up routes...");

  // Set up authentication first
  setupAuth(app);

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