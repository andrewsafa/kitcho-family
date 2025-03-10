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
    customerId?: number;
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

  log("Setting up auth middleware");
  app.use(session(sessionConfig));

  log("Auth middleware setup complete");
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