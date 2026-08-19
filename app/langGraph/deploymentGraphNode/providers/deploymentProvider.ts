import { DeploymentRecord, DeploymentQuery } from "../../../types/deployment.js";

/**
 * Standard Deployment Provider interface.
 * Implemented by adapters for GitHub Actions, Kubernetes, Render, ArgoCD, or database.
 */
export interface DeploymentProvider {
  /**
   * Fetch recent deployment history for a service
   */
  getDeployments(query: DeploymentQuery): Promise<DeploymentRecord[]>;

  /**
   * Fetch specific deployment record by ID
   */
  getDeploymentById(id: string): Promise<DeploymentRecord | null>;
}
