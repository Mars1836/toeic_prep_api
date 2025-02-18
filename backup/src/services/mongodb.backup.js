import CloudStorage from "./cloud.storage.js";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import winston from "winston";
const config = {
  filePath: "/backups/full",
  mongoURI: "mongodb://mongo:27017/toeic_prep",
  cronSchedule: "0 0 * * *", // 0 0 * * * = 00:00 every day
};
class MongoDBBackup {
  constructor() {
    this.cloudStorage = new CloudStorage();
    this.config = config;
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "backup-service.log" }),
      ],
    });
    this.setupCronJob();
  }
  async createFullBackupFile() {
    return new Promise(async (resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const namefile = `backup_full_${timestamp}.gz`;
      const filePath = path.join(this.config.filePath, namefile);
      fs.mkdirSync(this.config.filePath, { recursive: true });
      const cmd = `mongodump --uri ${this.config.mongoURI} --gzip --archive=${filePath} --db toeic_prep`;
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(err);
        }
        resolve(filePath);
      });
    });
  }
  setupCronJob() {
    cron.schedule(this.config.cronSchedule, async () => {
      this.logger.info("Starting scheduled backup");
      try {
        await this.performBackup();
        this.logger.info("Scheduled backup completed successfully");
      } catch (error) {
        this.logger.error("Scheduled backup failed:", error);
      }
    });
  }
  async cleanupLocalBackup(filePath) {
    try {
      await fs.promises.unlink(filePath);
      this.logger.info(`Local backup removed: ${filePath}`);
    } catch (error) {
      this.logger.error("Error removing local backup:", error);
      throw error;
    }
  }
  async performBackup() {
    const filePath = await this.createFullBackupFile();
    console.log(filePath);
    await this.cloudStorage.uploadFile(
      filePath,
      "backup/full/" + path.basename(filePath)
    );
    await this.cleanupLocalBackup(filePath);
  }
}

export default MongoDBBackup;
