import { Storage } from "@google-cloud/storage";
import fs from "fs";
const gcpConfig = {
  mongoUri: process.env.MONGO_URI,
  backupPath: process.env.BACKUP_PATH,
  cloud: {
    provider: "gcp",
    bucket: process.env.GCP_BUCKET,
    credentials: {
      projectId: process.env.GCP_PROJECT_ID,
      keyFilePath: process.env.GCP_KEY_FILE,
    },
  },
};
class CloudStorage {
  constructor() {
    this.storage = new Storage({
      projectId: gcpConfig.cloud.credentials.projectId,
      keyFilename: gcpConfig.cloud.credentials.keyFilePath,
    });
    this.bucket = this.storage.bucket(gcpConfig.cloud.bucket);
  }

  async uploadFile(filePath, destPath) {
    const file = this.bucket.file(destPath);
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(file.createWriteStream())
        .on("error", reject)
        .on("finish", resolve);
    });
  }
}

export default CloudStorage;
