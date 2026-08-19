import { z } from "zod";

export const deploymentCommitSchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  author: z.string(),
  message: z.string(),
  timestamp: z.string(),
  branch: z.string().optional(),
  prNumber: z.number().optional(),
  prTitle: z.string().optional(),
  prUrl: z.string().optional(),
  changedFiles: z.array(z.string()).optional(),
});

export const deploymentPipelineSchema = z.object({
  provider: z.enum([
    "GITHUB_ACTIONS",
    "KUBERNETES",
    "RENDER",
    "AWS_ECS",
    "GCP_CLOUDRUN",
    "ARGOCD",
    "MOCK",
    "DATABASE",
  ]),
  pipelineName: z.string().optional(),
  runId: z.string().optional(),
  runNumber: z.number().optional(),
  runUrl: z.string().optional(),
});

export const deploymentRecordSchema = z.object({
  id: z.string(),
  organizationId: z.string().optional(),
  service: z.string(),
  environment: z.string().default("production"),
  currentVersion: z.string(),
  previousVersion: z.string().optional(),
  status: z.enum(["SUCCESS", "FAILED", "IN_PROGRESS", "ROLLED_BACK"]),
  deployedAt: z.string(),
  deployedBy: z.string(),
  rollbackTargetVersion: z.string().optional(),
  commit: deploymentCommitSchema.optional(),
  pipeline: deploymentPipelineSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const deploymentQuerySchema = z.object({
  service: z.string().min(1, "Service name is required"),
  environment: z.string().optional(),
  limit: z.coerce.number().optional().default(5),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export const createDeploymentSchema = z.object({
  service: z.string().min(1, "Service name is required"),
  environment: z.string().default("production"),
  currentVersion: z.string().min(1, "Version is required"),
  previousVersion: z.string().optional(),
  status: z.enum(["SUCCESS", "FAILED", "IN_PROGRESS", "ROLLED_BACK"]).default("SUCCESS"),
  deployedAt: z.string().optional(),
  deployedBy: z.string().default("deploy-bot"),
  rollbackTargetVersion: z.string().optional(),
  commit: deploymentCommitSchema.optional(),
  pipeline: deploymentPipelineSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type DeploymentRecordInput = z.infer<typeof createDeploymentSchema>;
export type DeploymentQueryInput = z.infer<typeof deploymentQuerySchema>;
