import { Request, Response } from "express";
import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import {
  deploymentQuerySchema,
  createDeploymentSchema,
} from "../validators/deployment.validation.js";
import {
  getDeploymentsService,
  getDeploymentByIdService,
  createDeploymentService,
} from "../services/deployment.service.js";

/**
 * Controller to list deployment records filtered by service and environment
 */
export const getDeployments = wrapAsync(async (req: Request, res: Response) => {
  const parsed = deploymentQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ExpressError(
      `Invalid deployment query params: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
      400,
    );
  }

  const deployments = await getDeploymentsService({
    service: parsed.data.service,
    environment: parsed.data.environment,
    limit: parsed.data.limit,
  });

  res.status(200).json({
    success: true,
    count: deployments.length,
    deployments,
  });
});

/**
 * Controller to get a specific deployment by ID
 */
export const getDeploymentById = wrapAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id) {
    throw new ExpressError("Deployment ID is required", 400);
  }

  const deployment = await getDeploymentByIdService(id);

  if (!deployment) {
    throw new ExpressError(`Deployment not found with ID: ${id}`, 404);
  }

  res.status(200).json({
    success: true,
    deployment,
  });
});

/**
 * Controller to register a new deployment event (e.g. from CI/CD webhook)
 */
export const createDeployment = wrapAsync(async (req: Request, res: Response) => {
  const parsed = createDeploymentSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ExpressError(
      `Invalid deployment payload: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
      400,
    );
  }

  const deployment = await createDeploymentService(parsed.data);

  res.status(201).json({
    success: true,
    message: "Deployment registered successfully",
    deployment,
  });
});
