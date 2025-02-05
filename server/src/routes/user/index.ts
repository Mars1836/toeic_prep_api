import express from "express";
import { UserType } from "../../configs/interface";
import userAuthRouter from "./auth";
import userFlashcardRouter from "./flashcard";
import { handleAsync } from "../../middlewares/handle_async";
import { requireAuth } from "../../middlewares/require_auth";
import userSetFlashcardRouter from "./set_flashcard";
import testRouter from "./test";
import userResultRouter from "./result";
import userResultItemRouter from "./result_item";
import userPaymentRouter from "./payment";
import aiChatRouter from "./aichat";
import learingSetRouter from "./learning_set";
import learingFlashcardRouter from "./learning_flashcard";
import userProfileRouter from "./profile";
import providerRouter from "./provider";
import { RateLimitInstance } from "../../middlewares/rate_limit";
const routerU = express.Router();

routerU.use(
  "/auth",
  RateLimitInstance.createLowLimitMiddleware(),

  userAuthRouter
);
routerU.use(
  "/flashcard",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  userFlashcardRouter
);
routerU.use(
  "/set-flashcard",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  userSetFlashcardRouter
);
routerU.use(
  "/result",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  userResultRouter
);
routerU.use(
  "/result-item",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  userResultItemRouter
);
routerU.use("/test", RateLimitInstance.createHighLimitMiddleware(), testRouter);
routerU.use(
  "/payment",
  RateLimitInstance.createLowLimitMiddleware(),
  handleAsync(requireAuth),
  userPaymentRouter
);
routerU.use(
  "/ai-chat",
  RateLimitInstance.createLowLimitMiddleware(),
  handleAsync(requireAuth),
  aiChatRouter
);
routerU.use(
  "/learning-set",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  learingSetRouter
);
routerU.use(
  "/learning-flashcard",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  learingFlashcardRouter
);
routerU.use(
  "/profile",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  userProfileRouter
);
routerU.use(
  "/provider",
  RateLimitInstance.createHighLimitMiddleware(),
  handleAsync(requireAuth),
  providerRouter
);
export default routerU;
