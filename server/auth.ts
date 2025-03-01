import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { type Admin } from "@shared/schema";

const MemoryStore = createMemoryStore(session);
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
  app.use(
    session({
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      secret: "kitcho-family-secret",
      resave: false,
      saveUninitialized: false,
    })
  );

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await storage.getAdminByUsername(username);

      if (!admin || !(await comparePasswords(password, admin.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.adminId = admin.id;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/admin/me", async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const admin = await storage.getAdmin(req.session.adminId);
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    res.json(admin);
  });
}

export function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}