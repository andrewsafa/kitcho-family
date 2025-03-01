import { 
  type Customer, 
  type InsertCustomer,
  type PointTransaction,
  type InsertPointTransaction,
  type LevelBenefit,
  type InsertLevelBenefit,
  calculateLevel
} from "@shared/schema";

export interface IStorage {
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByMobile(mobile: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  listCustomers(): Promise<Customer[]>;
  addPoints(transaction: InsertPointTransaction): Promise<Customer>;
  getTransactions(customerId: number): Promise<PointTransaction[]>;
  getLevelBenefits(level: string): Promise<LevelBenefit[]>;
  addLevelBenefit(benefit: InsertLevelBenefit): Promise<LevelBenefit>;
  updateLevelBenefit(id: number, active: boolean): Promise<LevelBenefit>;
}

export class MemStorage implements IStorage {
  private customers: Map<number, Customer>;
  private transactions: Map<number, PointTransaction>;
  private benefits: Map<number, LevelBenefit>;
  private currentCustomerId: number;
  private currentTransactionId: number;
  private currentBenefitId: number;

  constructor() {
    this.customers = new Map();
    this.transactions = new Map();
    this.benefits = new Map();
    this.currentCustomerId = 1;
    this.currentTransactionId = 1;
    this.currentBenefitId = 1;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByMobile(mobile: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(c => c.mobile === mobile);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = this.currentCustomerId++;
    const customer: Customer = {
      id,
      ...insertCustomer,
      points: 0,
      level: "Bronze"
    };
    this.customers.set(id, customer);
    return customer;
  }

  async listCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async addPoints(transaction: InsertPointTransaction): Promise<Customer> {
    const customer = await this.getCustomer(transaction.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const txnId = this.currentTransactionId++;
    const timestamp = new Date();

    const txn: PointTransaction = {
      id: txnId,
      ...transaction,
      timestamp
    };
    this.transactions.set(txnId, txn);

    const updatedCustomer: Customer = {
      ...customer,
      points: customer.points + transaction.points,
    };
    updatedCustomer.level = calculateLevel(updatedCustomer.points);

    this.customers.set(customer.id, updatedCustomer);
    return updatedCustomer;
  }

  async getTransactions(customerId: number): Promise<PointTransaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLevelBenefits(level: string): Promise<LevelBenefit[]> {
    // Strict equality check for level matching
    const benefitsForLevel = Array.from(this.benefits.values())
      .filter(benefit => {
        return benefit.level === level && benefit.active;
      })
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    console.log(`Fetching benefits for level ${level}:`, benefitsForLevel);
    return benefitsForLevel;
  }

  async addLevelBenefit(benefit: InsertLevelBenefit): Promise<LevelBenefit> {
    const id = this.currentBenefitId++;
    const newBenefit: LevelBenefit = {
      id,
      ...benefit,
      active: true,
      lastUpdated: new Date()
    };
    console.log(`Adding new benefit for level ${benefit.level}:`, newBenefit);
    this.benefits.set(id, newBenefit);
    return newBenefit;
  }

  async updateLevelBenefit(id: number, active: boolean): Promise<LevelBenefit> {
    const benefit = this.benefits.get(id);
    if (!benefit) {
      throw new Error("Benefit not found");
    }
    const updatedBenefit: LevelBenefit = {
      ...benefit,
      active,
      lastUpdated: new Date()
    };
    this.benefits.set(id, updatedBenefit);
    return updatedBenefit;
  }
}

export const storage = new MemStorage();