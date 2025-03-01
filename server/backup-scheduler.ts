import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';
import { storage } from './storage';

interface BackupConfig {
  frequency: string; // cron expression
  maxBackups: number;
  enabled: boolean;
  backupDir: string;
}

interface BackupHistory {
  timestamp: string;
  filename: string;
  size: number;
}

class BackupScheduler {
  private config: BackupConfig;
  private cronJob: cron.ScheduledTask | null = null;
  private history: BackupHistory[] = [];
  private historyFile = 'backup-history.json';

  constructor() {
    // Default configuration
    this.config = {
      frequency: '0 0 * * *', // Daily at midnight
      maxBackups: 7, // Keep last 7 backups
      enabled: false,
      backupDir: 'backups'
    };
    this.loadHistory();
  }

  private async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      this.history = JSON.parse(data);
    } catch (error) {
      this.history = [];
    }
  }

  private async saveHistory() {
    await fs.writeFile(this.historyFile, JSON.stringify(this.history, null, 2));
  }

  async configure(config: Partial<BackupConfig>) {
    this.config = { ...this.config, ...config };
    
    // Ensure backup directory exists
    await fs.mkdir(this.config.backupDir, { recursive: true });

    if (this.cronJob) {
      this.cronJob.stop();
    }

    if (this.config.enabled && cron.validate(this.config.frequency)) {
      this.cronJob = cron.schedule(this.config.frequency, () => this.createBackup());
    }
  }

  async createBackup() {
    try {
      const timestamp = dayjs().format('YYYY-MM-DD-HH-mm-ss');
      const filename = `backup-${timestamp}.json`;
      const filepath = path.join(this.config.backupDir, filename);

      // Export data
      const data = await storage.exportData();
      const jsonData = JSON.stringify(data, null, 2);
      
      // Save backup
      await fs.writeFile(filepath, jsonData);

      // Update history
      const stats = await fs.stat(filepath);
      this.history.push({
        timestamp: dayjs().toISOString(),
        filename,
        size: stats.size
      });

      // Maintain only maxBackups number of backups
      const backupFiles = await fs.readdir(this.config.backupDir);
      if (backupFiles.length > this.config.maxBackups) {
        const oldestFiles = backupFiles
          .sort()
          .slice(0, backupFiles.length - this.config.maxBackups);

        for (const file of oldestFiles) {
          await fs.unlink(path.join(this.config.backupDir, file));
        }

        // Update history
        this.history = this.history
          .filter(h => !oldestFiles.includes(h.filename))
          .slice(-this.config.maxBackups);
      }

      await this.saveHistory();
      return { success: true, filename };
    } catch (error) {
      console.error('Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  getHistory(): BackupHistory[] {
    return [...this.history];
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export const backupScheduler = new BackupScheduler();
