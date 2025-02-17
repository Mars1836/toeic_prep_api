import dotenv from "dotenv";
import path from "path";
const env = process.env.APP_ENV;
const envFile = process.env.ENV_FILE;
console.log(env);
console.log(envFile);
if (envFile) {
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });
}
export {};
