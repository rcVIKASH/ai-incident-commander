import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { IntegrationRepository } from "../services/integration.repository.js";
import { generateOAuthState, handleGitHubCallback } from "../services/integration.service.js";

export const getGitHubIntegration = wrapAsync(async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    throw new ExpressError("Organization context is missing", 400);
  }

  const integration = await IntegrationRepository.findByOrganizationAndProvider(orgId, "GITHUB");

  if (!integration) {
    return res.status(200).json({
      success: true,
      integration: null,
    });
  }

  // Never return sensitive tokens to the frontend
  res.status(200).json({
    success: true,
    integration: {
      provider: integration.provider,
      status: integration.status,
      account: {
        id: integration.externalAccountId,
        name: integration.externalAccountName,
      },
      connectedAt: integration.createdAt,
    },
  });
});

export const connectGitHub = wrapAsync(async (req, res) => {
  const orgId = req.user?.organizationId;
  const userId = req.user?.userId;

  if (!orgId || !userId) {
    throw new ExpressError("Unauthorized or missing organization context", 401);
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new ExpressError("GitHub OAuth is not configured on the server", 500);
  }

  const state = generateOAuthState(orgId, userId);
  
  // Default scopes for readonly MCP usage
  const scopes = "read:user,repo";

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}`;

  res.redirect(githubAuthUrl);
});

export const githubCallback = wrapAsync(async (req, res) => {
  const { code, state } = req.query;

  if (!code || typeof code !== "string" || !state || typeof state !== "string") {
    throw new ExpressError("Invalid callback parameters", 400);
  }

  try {
    const { organizationId } = await handleGitHubCallback(code, state);
    
    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/integrations/github?success=true`);
  } catch (error: any) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/integrations/github?error=${encodeURIComponent(error.message)}`);
  }
});

export const disconnectGitHub = wrapAsync(async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    throw new ExpressError("Organization context is missing", 400);
  }

  await IntegrationRepository.deleteIntegration(orgId, "GITHUB");

  res.status(200).json({
    success: true,
    message: "GitHub integration disconnected successfully",
  });
});
