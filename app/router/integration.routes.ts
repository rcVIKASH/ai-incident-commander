import { Router } from "express";
import { 
  getGitHubIntegration, 
  connectGitHub, 
  githubCallback, 
  disconnectGitHub 
} from "../controllers/integration.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// We apply authMiddleware to routes that require user session
router.get("/github", authMiddleware, getGitHubIntegration);
router.get("/github/connect", authMiddleware, connectGitHub);
router.delete("/github", authMiddleware, disconnectGitHub);

// The callback comes from GitHub so it might not have the traditional API auth token 
// if it's a direct browser redirect, but typically in OAuth workflows with SPAs, 
// the callback redirects to the frontend which then exchanges the code, or the backend 
// handles the redirect natively. We won't apply isAuthenticate here to allow the browser 
// redirect to succeed if cookies aren't used for auth.
router.get("/github/callback", githubCallback);

export default router;
