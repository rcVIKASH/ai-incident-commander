import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  createOrganization,
  updateOrganization,
  updateUserRole,
  updateOwner
} from "../controllers/organization.controller.js";

const organizationRouter = Router();

// Create a new organization (requires authentication)
organizationRouter.post("/create", authMiddleware, createOrganization);

// Update organization (requires authentication)
organizationRouter.post("/update/:id", authMiddleware, updateOrganization);

// Update user role in organization (requires authentication, OWNER only)
organizationRouter.put("/:orgId/users/:userId/role", authMiddleware, updateUserRole);

// update owner
organizationRouter.put("/:orgId/users/:userId/owner", authMiddleware, updateOwner);

export default organizationRouter;
