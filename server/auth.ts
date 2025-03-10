import express from "express";
import session from "express-session";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { log } from "./vite";

const scryptAsync = promisify(scrypt);

declare module "express-session" {
  interface SessionData {
    adminId?: number;
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: express.Express) {
  // Session configuration
  const sessionConfig: session.SessionOptions = {
    store: storage.sessionStore,
    secret: process.env.SESSION_SECRET || "development-secret",
    resave: false,
    saveUninitialized: false,
    name: 'kitcho.sid', // Custom session cookie name
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  };

  log("Setting up session middleware with config:", {
    store: 'PostgreSQL',
    cookieSecure: sessionConfig.cookie?.secure,
    cookieMaxAge: sessionConfig.cookie?.maxAge
  });

  app.use(session(sessionConfig));

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      log("Admin login attempt...");
      const { username, password } = req.body;

      // Input validation
      if (!username || !password) {
        log("Login failed: Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      log(`Checking credentials for username: ${username}`);
      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        log("Login failed: Admin not found");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordValid = await comparePasswords(password, admin.password);
      if (!passwordValid) {
        log("Login failed: Invalid password");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.adminId = admin.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            log("Error saving session:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      log(`Admin login successful for user: ${username}`);
      res.json({ id: admin.id, username: admin.username });
    } catch (error) {
      log(`Admin login error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin session check endpoint
  app.get("/api/admin/me", async (req, res) => {
    try {
      log("Checking admin session...");
      log("Session data:", { adminId: req.session.adminId });

      if (!req.session.adminId) {
        log("No admin session found");
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getAdmin(req.session.adminId);
      if (!admin) {
        log("Admin not found for session ID");
        return res.status(401).json({ message: "Admin not found" });
      }

      log(`Admin session valid for: ${admin.username}`);
      res.json({ id: admin.id, username: admin.username });
    } catch (error) {
      log(`Admin session check error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create initial admin if none exists
  app.post("/api/admin/setup", async (req, res) => {
    try {
      log("Attempting to create initial admin...");
      const existingAdmins = await storage.listAdmins();
      if (existingAdmins.length > 0) {
        log("Admin already exists");
        return res.status(400).json({ message: "Admin already exists" });
      }

      const hashedPassword = await hashPassword("admin123");
      const admin = await storage.createAdmin({
        username: "admin",
        password: hashedPassword
      });

      log("Initial admin created successfully");
      res.json({ message: "Initial admin created", admin: { id: admin.id, username: admin.username } });
    } catch (error) {
      log(`Admin setup error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/admin/logout", (req, res) => {
    log("Admin logout request...");
    req.session.destroy(() => {
      log("Admin session destroyed");
      res.json({ success: true });
    });
  });
}

export function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.session.adminId) {
    log("Admin authentication required but no session found");
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}