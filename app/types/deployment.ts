/**
 * Deployment and Release Evidence Types
 * Standardized data models for deployment events, release metadata, and CI/CD pipelines
 */

export type DeploymentStatus = "SUCCESS" | "FAILED" | "IN_PROGRESS" | "ROLLED_BACK";

export type DeploymentProviderType =
  | "GITHUB_ACTIONS"
  | "KUBERNETES"
  | "RENDER"
  | "AWS_ECS"
  | "GCP_CLOUDRUN"
  | "ARGOCD"
  | "MOCK"
  | "DATABASE";

export interface DeploymentCommit {
  hash: string;
  shortHash: string;
  author: string;
  message: string;
  timestamp: string;
  branch?: string;
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
  changedFiles?: string[];
}

export interface DeploymentPipeline {
  provider: DeploymentProviderType;
  pipelineName?: string;
  runId?: string;
  runNumber?: number;
  runUrl?: string;
}

export interface DeploymentRecord {
  id: string;
  organizationId?: string;
  service: string;
  environment: string;
  currentVersion: string;
  previousVersion?: string;
  status: DeploymentStatus;
  deployedAt: string; // ISO 8601 string
  deployedBy: string; // User email or bot
  rollbackTargetVersion?: string;
  commit?: DeploymentCommit;
  pipeline?: DeploymentPipeline;
  metadata?: Record<string, any>;
}

export interface DeploymentQuery {
  service: string;
  environment?: string;
  limit?: number;
  timeRange?: {
    start?: string;
    end?: string;
  };
}

export type SuspiciousChangeSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface DeploymentSummary {
  recentCount: number;
  latestDeployment?: DeploymentRecord;
  latestVersion?: string;
  lastDeployedAt?: string;
  timeSinceDeploymentMinutes?: number;
  isRecentDeployment: boolean;
  suspiciousChangeFlag: SuspiciousChangeSeverity;
  correlationReasoning: string;
  summaryText: string;
}
