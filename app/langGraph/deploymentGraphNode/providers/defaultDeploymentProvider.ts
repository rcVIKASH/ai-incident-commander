import { DeploymentProvider } from "./deploymentProvider.js";
import { DeploymentRecord, DeploymentQuery } from "../../../types/deployment.js";
import {
  getDeploymentsService,
  getDeploymentByIdService,
} from "../../../services/deployment.service.js";

/**
 * Default Deployment Provider backed by deployment service (mock & persistent stores)
 */
export class DefaultDeploymentProvider implements DeploymentProvider {
  async getDeployments(query: DeploymentQuery): Promise<DeploymentRecord[]> {
    return getDeploymentsService(query);
  }

  async getDeploymentById(id: string): Promise<DeploymentRecord | null> {
    return getDeploymentByIdService(id);
  }
}
