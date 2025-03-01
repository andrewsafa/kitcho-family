import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertPointTransactionSchema, insertLevelBenefitSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express) {
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

  app.get("/api/customers", async (_req, res) => {
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

  app.post("/api/benefits", async (req, res) => {
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

  app.patch("/api/benefits/:id", async (req, res) => {
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
  app.post("/api/points", async (req, res) => {
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

  return createServer(app);
}