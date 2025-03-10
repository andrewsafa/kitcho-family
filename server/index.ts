import express from "express";
import { log } from "./vite";

// Start-up diagnostic logging
log("=== Server Initialization Started ===");
log(`NODE_ENV: ${process.env.NODE_ENV}`);
log(`PORT: ${process.env.PORT}`);
log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

const app = express();
app.use(express.json());

// Basic health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log(`Error: ${err.message}`);
  res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT) || 5000;
const host = "0.0.0.0";

// Pre-listen diagnostic logging
log("=== Attempting Server Start ===");
log(`Binding to port: ${port}`);
log(`Binding to host: ${host}`);

app.listen(port, host, () => {
  log("=== Server Started Successfully ===");
  log(`Listening on: http://${host}:${port}`);
  log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (error) => {
  log("=== Server Failed to Start ===");
  log(`Error: ${error.message}`);
  process.exit(1);
});