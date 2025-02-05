import "./configs/dotenv";
import fs from "fs";
import app from "./app";
import { connectMongo } from "./connect/mongo";
import { connectRedis } from "./connect/redis";
import expressListEndpoints from "express-list-endpoints";

connectMongo();
connectRedis();
// main();
declare global {
  namespace Express {
    interface User {
      id: string;
      // Add other properties as needed
    }
  }
}
function writeApiToFile() {
  const endpoints = expressListEndpoints(app);
  fs.writeFileSync(
    "endpoins.json",
    JSON.stringify(
      endpoints.map((item) => {
        return {
          path: item.path,
          methods: item.methods,
        };
      }),
      null,
      2
    ),
    "utf-8"
  );
}
writeApiToFile();
// Show routes
app.listen(4000, () => {
  console.log("Listening on 4000 :: server is running");
});
