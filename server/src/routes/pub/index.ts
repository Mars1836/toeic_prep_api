import express from "express";

import testRouter from "./test";
import { handleAsync } from "../../middlewares/handle_async";
import pubPaymentRouter from "./payment";
import uploadRouter from "./upload_test";
import wordRouter from "./word";
import pubBlogRouter from "./blog";
import pubTranscriptTestRouter from "./transcript_test";
import pubTranscriptTestItemRouter from "./transcript_test_item";
import { RateLimitInstance } from "../../middlewares/rate_limit";
const routerP = express.Router();
routerP.use("/test", RateLimitInstance.createHighLimitMiddleware(), testRouter);
routerP.use(
  "/payment",
  RateLimitInstance.createHighLimitMiddleware(),
  pubPaymentRouter
);
routerP.use(
  "/upload",
  RateLimitInstance.createHighLimitMiddleware(),
  uploadRouter
);
routerP.use("/word", RateLimitInstance.createHighLimitMiddleware(), wordRouter);
routerP.use(
  "/blog",
  RateLimitInstance.createHighLimitMiddleware(),
  pubBlogRouter
);
routerP.use(
  "/transcript-test",
  RateLimitInstance.createHighLimitMiddleware(),
  pubTranscriptTestRouter
);
routerP.use(
  "/transcript-test-item",
  RateLimitInstance.createHighLimitMiddleware(),
  pubTranscriptTestItemRouter
);
export default routerP;
