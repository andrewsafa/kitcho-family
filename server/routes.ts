import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialEventSchema, insertSpecialOfferSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, requireAdmin } from "./auth";

export async function registerRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  // Customer routes
  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const existing = await storage.getCustomerByMobile(customerData.mobile);
      if (existing) {
        return res.status(409).json({ message: "Mobile number already registered" });
      }
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/customers/mobile/:mobile", async (req, res) => {
    const customer = await storage.getCustomerByMobile(req.params.mobile);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  });

  app.get("/api/customers", requireAdmin, async (_req, res) => {
    const customers = await storage.listCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id/transactions", async (req, res) => {
    const transactions = await storage.getTransactions(parseInt(req.params.id));
    res.json(transactions);
  });

  // Level Benefits routes
  app.get("/api/benefits/:level", async (req, res) => {
    const benefits = await storage.getLevelBenefits(req.params.level);
    res.json(benefits);
  });

  app.post("/api/benefits", requireAdmin, async (req, res) => {
    try {
      const benefitData = insertLevelBenefitSchema.parse(req.body);
      const benefit = await storage.addLevelBenefit(benefitData);
      res.status(201).json(benefit);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/benefits/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const benefit = await storage.updateLevelBenefit(id, active);
      res.json(benefit);
    } catch (error) {
      res.status(404).json({ message: "Benefit not found" });
    }
  });

  // Admin routes
  app.post("/api/points", requireAdmin, async (req, res) => {
    try {
      const transactionData = insertPointTransactionSchema.parse(req.body);
      const customer = await storage.addPoints(transactionData);
      res.json(customer);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Special Events routes
  app.get("/api/events", async (_req, res) => {
    const events = await storage.listActiveEvents();
    res.json(events);
  });

  app.post("/api/events", requireAdmin, async (req, res) => {
    try {
      const eventData = insertSpecialEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/events/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const event = await storage.updateEventStatus(id, active);
      res.json(event);
    } catch (error) {
      res.status(404).json({ message: "Event not found" });
    }
  });

  // Special Offers routes
  app.get("/api/offers/:level", async (req, res) => {
    const offers = await storage.getSpecialOffers(req.params.level);
    res.json(offers);
  });

  app.post("/api/offers", requireAdmin, async (req, res) => {
    try {
      const offerData = insertSpecialOfferSchema.parse(req.body);
      const offer = await storage.createSpecialOffer(offerData);
      res.status(201).json(offer);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      const offer = await storage.updateSpecialOfferStatus(id, active);
      res.json(offer);
    } catch (error) {
      res.status(404).json({ message: "Special offer not found" });
    }
  });

  return createServer(app);
}