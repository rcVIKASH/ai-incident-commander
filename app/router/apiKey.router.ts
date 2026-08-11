import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { generateApiKey } from "../controllers/apiKey.controller.js";

const apiKeyRouter = Router();

// Generate API key (requires authentication)
apiKeyRouter.post("/generate", authMiddleware, generateApiKey);

export default apiKeyRouter;
