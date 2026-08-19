import { Router } from "express";
import {
  getDeployments,
  getDeploymentById,
  createDeployment,
} from "../controllers/deployment.controller.js";

const router = Router();

router.get("/", getDeployments);
router.get("/:id", getDeploymentById);
router.post("/", createDeployment);

export default router;
