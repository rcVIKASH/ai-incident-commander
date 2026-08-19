import { DeploymentRecord, DeploymentQuery } from "../types/deployment.js";
import { DeploymentRecordInput } from "../validators/deployment.validation.js";

/**
 * Seeded mock database storage for deployments across key microservices.
 * Used for development, local testing, and mock provider simulation.
 */
const mockDeploymentDatabase: DeploymentRecord[] = [
  {
    id: "dep-pay-001",
    service: "payment-gateway",
    environment: "production",
    currentVersion: "v2.4.1",
    previousVersion: "v2.4.0",
    status: "SUCCESS",
    // 4 minutes before typical incident timestamp
    deployedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    deployedBy: "ci-bot@company.internal",
    rollbackTargetVersion: "v2.4.0",
    commit: {
      hash: "a8f192b49c71b6d0e82f5b8a09f3e498c17b8192",
      shortHash: "a8f192b",
      author: "alex.dev@company.com",
      message: "fix(checkout): optimize DB query connection pooling in /v1/charge",
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      branch: "main",
      prNumber: 342,
      prTitle: "Optimize DB connection pooling in charge controller",
      prUrl: "https://github.com/company/payment-gateway/pull/342",
      changedFiles: [
        "app/controllers/charge.controller.ts",
        "app/db/connectionPool.ts",
        "config/database.json",
      ],
    },
    pipeline: {
      provider: "GITHUB_ACTIONS",
      pipelineName: "Deploy to Production ECS",
      runId: "run-984210",
      runNumber: 142,
      runUrl: "https://github.com/company/payment-gateway/actions/runs/984210",
    },
    metadata: {
      cluster: "prod-us-east-1",
      containerImage: "registry.company.com/payment-gateway:v2.4.1",
      replicas: 8,
    },
  },
  {
    id: "dep-pay-000",
    service: "payment-gateway",
    environment: "production",
    currentVersion: "v2.4.0",
    previousVersion: "v2.3.9",
    status: "SUCCESS",
    deployedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deployedBy: "sarah.sre@company.com",
    rollbackTargetVersion: "v2.3.9",
    commit: {
      hash: "f3c8a910de12ab34cd56ef78ab90123456789abc",
      shortHash: "f3c8a91",
      author: "sarah.sre@company.com",
      message: "feat: add Stripe webhook idempotency keys",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      branch: "main",
      prNumber: 338,
      prTitle: "Stripe webhook idempotency keys",
      prUrl: "https://github.com/company/payment-gateway/pull/338",
      changedFiles: ["app/webhooks/stripe.ts"],
    },
    pipeline: {
      provider: "GITHUB_ACTIONS",
      pipelineName: "Deploy to Production ECS",
      runId: "run-973001",
      runNumber: 141,
    },
  },
  {
    id: "dep-auth-001",
    service: "auth-service",
    environment: "production",
    currentVersion: "v1.9.0",
    previousVersion: "v1.8.4",
    status: "SUCCESS",
    deployedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    deployedBy: "devops-ci@company.internal",
    commit: {
      hash: "7b4c910123ef456789abc0123456789abcdef012",
      shortHash: "7b4c910",
      author: "kevin.auth@company.com",
      message: "chore: upgrade JWT signing library to v9",
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      branch: "main",
      prNumber: 89,
      prTitle: "Upgrade JWT signing library",
      prUrl: "https://github.com/company/auth-service/pull/89",
    },
    pipeline: {
      provider: "GITHUB_ACTIONS",
      pipelineName: "Production Release",
      runId: "run-882110",
    },
  },
];

/**
 * Service to query deployment records for a specific microservice from DB / Mock store
 */
export async function getDeploymentsService(
  query: DeploymentQuery,
): Promise<DeploymentRecord[]> {
  const { service, environment = "production", limit = 5 } = query;

  console.log(
    `📦 [DeploymentService] Fetching deployments from DB for service="${service}" (env: "${environment}", limit: ${limit})...`,
  );

  const matched = mockDeploymentDatabase.filter((dep) => {
    const serviceMatch =
      dep.service.toLowerCase() === service.toLowerCase() ||
      dep.service.toLowerCase().includes(service.toLowerCase().split(/[-_]/)[0]);

    const envMatch = !environment || dep.environment.toLowerCase() === environment.toLowerCase();

    return serviceMatch && envMatch;
  });

  // Sort descending by deployment timestamp
  matched.sort(
    (a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime(),
  );

  const results = matched.slice(0, limit);

  console.log(
    `✅ [DeploymentService] Found ${results.length} deployment record(s) for service="${service}":`,
  );
  for (const dep of results) {
    console.log(
      `   • [${dep.status}] ${dep.service} ${dep.currentVersion} (deployedAt: ${dep.deployedAt}, commit: ${dep.commit?.shortHash || "N/A"} - "${dep.commit?.message || "No message"}")`,
    );
  }

  return results;
}

/**
 * Service to get single deployment by ID
 */
export async function getDeploymentByIdService(
  id: string,
): Promise<DeploymentRecord | null> {
  const found = mockDeploymentDatabase.find((dep) => dep.id === id);
  return found || null;
}

/**
 * Service to register a new deployment event (e.g. from webhook or CI/CD)
 */
export async function createDeploymentService(
  input: DeploymentRecordInput,
): Promise<DeploymentRecord> {
  const newDeployment: DeploymentRecord = {
    id: `dep-${Date.now()}`,
    service: input.service,
    environment: input.environment,
    currentVersion: input.currentVersion,
    previousVersion: input.previousVersion,
    status: input.status,
    deployedAt: input.deployedAt || new Date().toISOString(),
    deployedBy: input.deployedBy,
    rollbackTargetVersion: input.rollbackTargetVersion,
    commit: input.commit,
    pipeline: input.pipeline,
    metadata: input.metadata,
  };

  mockDeploymentDatabase.unshift(newDeployment);

  console.log(
    `🚀 [DeploymentService] Registered new deployment: ${newDeployment.service} ${newDeployment.currentVersion} (${newDeployment.id})`,
  );

  return newDeployment;
}
