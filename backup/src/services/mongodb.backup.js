import CloudStorage from "./cloud.storage.js";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const config = {
  filePath: "/backups/full",
  mongoURI: "mongodb://mongo-1:27017/toeic_prep",
};
class MongoDBBackup {
  constructor() {
    this.cloudStorage = new CloudStorage();
    this.config = config;
  }
  createFullBackupFile() {
    return new Promise(async (resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const namefile = `backup_full_${timestamp}.gz`;
      const filePath = path.join(this.config.filePath, namefile);
      fs.mkdirSync(filePath, { recursive: true });
      const cmd = `mongodump --uri ${this.config.mongoURI} --gzip --archive=${filePath} --db toeic_prep`;
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(err);
        }
        resolve(namefile);
      });
    });
  }
}

export default MongoDBBackup;
