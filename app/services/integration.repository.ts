import { prisma } from "../db/config.js";
import { IntegrationProvider, IntegrationStatus } from "../db/generated/core-prisma/client.js";

interface CreateOrUpdateIntegrationArgs {
  organizationId: string;
  provider: IntegrationProvider;
  status?: IntegrationStatus;
  externalAccountId?: string;
  externalAccountName?: string;
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  scopes?: any;
  metadata?: any;
}

export class IntegrationRepository {
  /**
   * Find an integration by organization and provider
   */
  static async findByOrganizationAndProvider(
    organizationId: string,
    provider: IntegrationProvider
  ) {
    return prisma.organizationIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
    });
  }

  /**
   * Create or update an integration
   */
  static async createOrUpdateIntegration(args: CreateOrUpdateIntegrationArgs) {
    const { organizationId, provider, ...updateData } = args;
    
    return prisma.organizationIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
      create: {
        organizationId,
        provider,
        ...updateData,
      },
      update: {
        ...updateData,
      },
    });
  }

  /**
   * Delete an integration
   */
  static async deleteIntegration(
    organizationId: string,
    provider: IntegrationProvider
  ) {
    return prisma.organizationIntegration.delete({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
    });
  }

  /**
   * Helper to get an active GitHub integration for an organization
   */
  static async getActiveGitHubIntegration(organizationId: string) {
    const integration = await this.findByOrganizationAndProvider(
      organizationId,
      "GITHUB" as IntegrationProvider
    );

    if (!integration || integration.status !== ("ACTIVE" as IntegrationStatus)) {
      return null;
    }

    return integration;
  }
}
