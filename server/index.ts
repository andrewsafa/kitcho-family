import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

log("=== Starting Server ===");

(async () => {
  try {
    // Basic server setup
    const server = await registerRoutes(app);

    // Simple error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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

    server.listen({
      port,
      host,
    }, () => {
      log("=== Server Started Successfully ===");
      log(`Listening on: http://${host}:${port}`);
    });
  } catch (error) {
    log("=== Server Failed to Start ===");
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();