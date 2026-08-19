import {
  DeploymentRecord,
  DeploymentSummary,
  SuspiciousChangeSeverity,
} from "../../types/deployment.js";
import { IncidentClassification } from "../../validators/incidentClassification.validation.js";

/**
 * Pure calculation engine for deployment evidence.
 * Calculates time delta between incident detection and recent releases,
 * assigns suspicious change flags, and formats context for LLM RCA synthesis.
 */
export function processDeployments(
  deployments: DeploymentRecord[],
  incidentTimestampStr?: string,
  classification?: IncidentClassification,
): DeploymentSummary {
  if (!deployments || deployments.length === 0) {
    return {
      recentCount: 0,
      isRecentDeployment: false,
      suspiciousChangeFlag: "NONE",
      correlationReasoning: "No recent deployments found for this service.",
      summaryText: "🚀 DEPLOYMENT EVIDENCE:\n- No recent deployments detected for this service.",
    };
  }

  // Sort descending by deployedAt
  const sorted = [...deployments].sort(
    (a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime(),
  );

  const latest = sorted[0];
  const incidentTime = incidentTimestampStr ? new Date(incidentTimestampStr) : new Date();
  const deployTime = new Date(latest.deployedAt);

  const diffMs = incidentTime.getTime() - deployTime.getTime();
  const timeSinceDeploymentMinutes = Math.round(diffMs / (60 * 1000));

  // Determine recency & suspicious change flag
  let isRecentDeployment = false;
  let suspiciousChangeFlag: SuspiciousChangeSeverity = "NONE";
  let correlationReasoning = "";

  if (timeSinceDeploymentMinutes >= -5 && timeSinceDeploymentMinutes <= 15) {
    // Deployed within 15 minutes before the incident (or right around detection)
    isRecentDeployment = true;
    suspiciousChangeFlag = "CRITICAL";
    correlationReasoning = `High probability of causal relationship: Version ${latest.currentVersion} was deployed ${timeSinceDeploymentMinutes} minute(s) before incident detection.`;
  } else if (timeSinceDeploymentMinutes > 15 && timeSinceDeploymentMinutes <= 60) {
    // Deployed 15-60 minutes before the incident
    isRecentDeployment = true;
    suspiciousChangeFlag = "HIGH";
    correlationReasoning = `Strong temporal correlation: Version ${latest.currentVersion} was deployed ${timeSinceDeploymentMinutes} minutes before the incident.`;
  } else if (timeSinceDeploymentMinutes > 60 && timeSinceDeploymentMinutes <= 180) {
    // Deployed 1-3 hours before
    isRecentDeployment = true;
    suspiciousChangeFlag = "MEDIUM";
    correlationReasoning = `Moderate temporal proximity: Version ${latest.currentVersion} was deployed ${Math.round(timeSinceDeploymentMinutes / 60)} hours before the incident.`;
  } else if (timeSinceDeploymentMinutes > 180 && timeSinceDeploymentMinutes <= 1440) {
    // Deployed within 24 hours
    isRecentDeployment = false;
    suspiciousChangeFlag = "LOW";
    correlationReasoning = `Low correlation: Last deployment ${latest.currentVersion} was ${Math.round(timeSinceDeploymentMinutes / 60)} hours ago.`;
  } else {
    isRecentDeployment = false;
    suspiciousChangeFlag = "NONE";
    correlationReasoning = `Deployment occurred ${Math.round(timeSinceDeploymentMinutes / (60 * 24))} day(s) ago; unlikely to be the immediate trigger.`;
  }

  // Adjust reasoning if commit message matches incident classification category
  if (latest.commit && classification) {
    const commitMsg = (latest.commit.message || "").toLowerCase();
    const prTitle = (latest.commit.prTitle || "").toLowerCase();
    const likelyCat = (classification.likelyCategory || "").toLowerCase();

    if (
      likelyCat.includes("database") ||
      likelyCat.includes("connection") ||
      likelyCat.includes("latency")
    ) {
      if (
        commitMsg.includes("db") ||
        commitMsg.includes("pool") ||
        commitMsg.includes("query") ||
        prTitle.includes("db") ||
        prTitle.includes("pool")
      ) {
        correlationReasoning += ` Direct functional match: PR/Commit touched database/connection logic ("${latest.commit.message}").`;
      }
    }
  }

  const summaryText = buildDeploymentSummaryText(
    latest,
    sorted.length,
    timeSinceDeploymentMinutes,
    suspiciousChangeFlag,
    correlationReasoning,
  );

  return {
    recentCount: sorted.length,
    latestDeployment: latest,
    latestVersion: latest.currentVersion,
    lastDeployedAt: latest.deployedAt,
    timeSinceDeploymentMinutes,
    isRecentDeployment,
    suspiciousChangeFlag,
    correlationReasoning,
    summaryText,
  };
}

function buildDeploymentSummaryText(
  latest: DeploymentRecord,
  totalCount: number,
  timeSinceMinutes: number,
  flag: SuspiciousChangeSeverity,
  reasoning: string,
): string {
  const lines: string[] = [
    `🚀 DEPLOYMENT EVIDENCE (${totalCount} recorded):`,
    `- Current Release: ${latest.currentVersion} (previous: ${latest.previousVersion || "N/A"})`,
    `- Deployed At: ${latest.deployedAt} (${timeSinceMinutes} mins relative to incident detection)`,
    `- Status: ${latest.status} by ${latest.deployedBy}`,
    `- Provider: ${latest.pipeline?.provider || "N/A"} (${latest.pipeline?.pipelineName || "CI/CD"})`,
  ];

  if (latest.commit) {
    lines.push(
      `- Git Commit: [${latest.commit.shortHash}] ${latest.commit.message}`,
      `- Author: ${latest.commit.author}`,
    );
    if (latest.commit.prNumber) {
      lines.push(
        `- GitHub PR: #${latest.commit.prNumber} "${latest.commit.prTitle || latest.commit.message}" (${latest.commit.prUrl || ""})`,
      );
    }
    if (latest.commit.changedFiles && latest.commit.changedFiles.length > 0) {
      lines.push(
        `- Changed Files: ${latest.commit.changedFiles.map((f) => `\`${f}\``).join(", ")}`,
      );
    }
  }

  lines.push(
    `- Suspicious Change Flag: [${flag}]`,
    `- Correlation Assessment: ${reasoning}`,
  );

  return lines.join("\n");
}
