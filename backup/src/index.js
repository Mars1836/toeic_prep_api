import express from "express";
import path from "path";
import "./configs/dotenv.js";
import { fileURLToPath } from "url";
import CloudStorage from "./services/cloud.storage.js";
import MongoDBBackup from "./services/mongodb.backup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

new MongoDBBackup();

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
