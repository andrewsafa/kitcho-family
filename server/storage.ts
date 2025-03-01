import { 
  type Customer, 
  type InsertCustomer,
  type PointTransaction,
  type InsertPointTransaction,
  calculateLevel
} from "@shared/schema";

export interface IStorage {
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByMobile(mobile: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  listCustomers(): Promise<Customer[]>;
  addPoints(transaction: InsertPointTransaction): Promise<Customer>;
  getTransactions(customerId: number): Promise<PointTransaction[]>;
}

export class MemStorage implements IStorage {
  private customers: Map<number, Customer>;
  private transactions: Map<number, PointTransaction>;
  private currentCustomerId: number;
  private currentTransactionId: number;

  constructor() {
    this.customers = new Map();
    this.transactions = new Map();
    this.currentCustomerId = 1;
    this.currentTransactionId = 1;
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
}

export const storage = new MemStorage();
