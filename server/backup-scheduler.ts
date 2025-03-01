import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';
import { storage } from './storage';
import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not set, email notifications will be disabled");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface BackupConfig {
  frequency: string; // cron expression
  maxBackups: number;
  enabled: boolean;
  backupDir: string;
  emailTo?: string; // recipient email address
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
      // Create history file if it doesn't exist
      await this.saveHistory();
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

    // Save configuration
    await fs.writeFile('backup-config.json', JSON.stringify(this.config, null, 2));
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
      const backupEntry = {
        timestamp: dayjs().toISOString(),
        filename,
        size: stats.size
      };
      this.history.push(backupEntry);

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

      // Send email if configured
      if (this.config.emailTo && process.env.SENDGRID_API_KEY) {
        try {
          const msg = {
            to: this.config.emailTo,
            from: 'noreply@kitchofamily.com', // Use your verified sender
            subject: `Kitcho Family Backup - ${timestamp}`,
            text: 'Your backup is attached.',
            attachments: [
              {
                content: Buffer.from(jsonData).toString('base64'),
                filename,
                type: 'application/json',
                disposition: 'attachment'
              }
            ]
          };

          await sgMail.send(msg);
          console.log(`Backup email sent to ${this.config.emailTo}`);
        } catch (error) {
          console.error('Failed to send backup email:', error);
        }
      }

      return { success: true, filename };
    } catch (error: any) {
      console.error('Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  async loadConfig() {
    try {
      const data = await fs.readFile('backup-config.json', 'utf8');
      this.config = JSON.parse(data);
      // Re-initialize cron job with loaded config
      if (this.config.enabled && cron.validate(this.config.frequency)) {
        if (this.cronJob) this.cronJob.stop();
        this.cronJob = cron.schedule(this.config.frequency, () => this.createBackup());
      }
    } catch (error) {
      // Use default config if file doesn't exist
      await this.configure(this.config);
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

// Create and initialize the backup scheduler
export const backupScheduler = new BackupScheduler();
backupScheduler.loadConfig().catch(console.error);