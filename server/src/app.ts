import { Response } from "express";
import cookieSession from "cookie-session";

import cors from "cors";
import { handleError } from "./middlewares/handle_error";
import { passportA, passportU } from "./configs/passport";
import routerU from "./routes/user";
import routerA from "./routes/admin";
import routerP from "./routes/pub";
import path from "path";
import serveIndex from "serve-index";
const express = require("express");
const app = express();
// Lấy môi trường từ process.env.NODE_ENV

// Load file env tương ứng

app.set("trust proxy", true);
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));

const env = process.env.APP_ENV;
const userCookieConfig =
  env === "prod" || env === "docker"
    ? { name: "user-session", sameSite: "none", httpOnly: true, signed: false }
    : {
        name: "user-session",
        sameSite: "lax",
        httpOnly: true,
        signed: false,
      };
const adminCookieConfig =
  env === "prod" || env === "docker"
    ? {
        name: "admin-session",
        sameSite: "none",
        httpOnly: true,
        signed: false,
      }
    : {
        name: "admin-session",
        sameSite: "lax",
        httpOnly: true,
        signed: false,
      };
app.use(
  "/",
  cookieSession({
    name: "pub",
    signed: false,
    // secure: true, // must be connect in https connection
  })
);
app.use(
  "/api/user",
  // @ts-ignore
  cookieSession(userCookieConfig)
);
app.use(
  "/api/admin",
  // @ts-ignore
  cookieSession(adminCookieConfig)
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/uploads",
  serveIndex(path.join(__dirname, "uploads"), {
    icons: true, // Hiển thị icon cho các file
    view: "details", // Hiển thị chi tiết (size, modified date, etc.)
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passportA.initialize({ userProperty: "user" }));
app.use(passportA.session());
app.use(passportU.initialize({ userProperty: "user" }));
app.use(passportU.session());
app.use("/api/user", routerU);
app.use("/api/admin", routerA);
app.use("/api/pub", routerP);
app.use("/test", (req: Request, res: Response) => {
  res.json("test");
});

app.use(handleError);

export default app;
