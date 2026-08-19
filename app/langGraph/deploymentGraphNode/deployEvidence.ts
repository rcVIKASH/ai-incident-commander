import { DeploymentStateType } from "./deploymentState.js";
import { DefaultDeploymentProvider } from "./providers/defaultDeploymentProvider.js";
import { processDeployments } from "./deploymentProcessor.js";

/**
 * Dedicated Deployment Evidence Collection and Correlation Node (deployEvidence)
 *
 * Fetches recent releases, commits, PRs, and CI/CD pipelines for the affected service,
 * calculates the time delta relative to incident detection, and evaluates change causality.
 */
export const deployEvidence = async (
  state: Partial<DeploymentStateType>,
): Promise<Partial<DeploymentStateType>> => {
  const incident = state.incident;

  if (!incident || !incident.service) {
    console.warn("⚠️ [DeployEvidence] Missing incident service in state, skipping deployment check.");
    return {
      error: "Missing incident service in state",
    };
  }

  const service = incident.service;
  const environment = incident.environment || incident.metadata?.environment || "production";
  const incidentTimestamp = incident.timestamp || new Date().toISOString();

  console.log(
    `\n🔍 [DeployEvidence] Querying deployment history & change logs for service="${service}" (env: "${environment}")...`,
  );

  try {
    const provider = new DefaultDeploymentProvider();

    const rawDeployments = await provider.getDeployments({
      service,
      environment,
      limit: 5,
    });

    const deploymentSummary = processDeployments(
      rawDeployments,
      incidentTimestamp,
      state.classification,
    );

    console.log(`\n📊 [DeployEvidence] Deployment Correlation Analysis Result:`);
    console.log(deploymentSummary.summaryText);

    return {
      rawDeployments,
      deploymentSummary,
    };
  } catch (err: any) {
    console.error(
      `❌ [DeployEvidence] Failed to collect deployment evidence:`,
      err?.message || err,
    );
    return {
      error: err?.message || "Failed to collect deployment evidence",
    };
  }
};
