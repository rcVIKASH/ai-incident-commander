import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  createOrganization,
  updateOrganization,
} from "../controllers/organization.controller.js";

const organizationRouter = Router();

// Create a new organization (requires authentication)
organizationRouter.post("/create", authMiddleware, createOrganization);

// Update organization (requires authentication)
organizationRouter.post("/update/:id", authMiddleware, updateOrganization);

export default organizationRouter;
