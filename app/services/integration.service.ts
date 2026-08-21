import crypto from "crypto";
import { IntegrationRepository } from "./integration.repository.js";
import { encryptIntegrationSecret } from "./encryption.service.js";

// Ensure required environment variables for OAuth are set
function getOAuthEnv() {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  
  // We allow skipping this check if we aren't actively doing the OAuth flow, 
  // but if we reach the OAuth methods below without them, it will throw.
  return { clientId, clientSecret };
}

/**
 * Creates a signed OAuth state for the given organization.
 * The state contains the organization ID and a secure signature to prevent tampering.
 */
export function generateOAuthState(organizationId: string, userId: string): string {
  const secret = process.env.JWT_SECRET || "fallback_secret";
  const payload = JSON.stringify({
    org: organizationId,
    user: userId,
    exp: Date.now() + 1000 * 60 * 15, // 15 mins expiry
  });

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const signature = hmac.digest("hex");

  const stateObj = {
    p: Buffer.from(payload).toString("base64"),
    s: signature,
  };

  return Buffer.from(JSON.stringify(stateObj)).toString("base64");
}

/**
 * Validates a signed OAuth state and returns the organization ID.
 */
export function validateOAuthState(stateString: string): { organizationId: string, userId: string } {
  try {
    const secret = process.env.JWT_SECRET || "fallback_secret";
    const decodedState = Buffer.from(stateString, "base64").toString("utf-8");
    const { p: payloadBase64, s: signature } = JSON.parse(decodedState);

    const payload = Buffer.from(payloadBase64, "base64").toString("utf-8");
    
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Invalid state signature");
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.exp) {
      throw new Error("State has expired");
    }

    return { organizationId: data.org, userId: data.user };
  } catch (err: any) {
    throw new Error("Invalid OAuth state: " + err.message);
  }
}

/**
 * Exchanges a GitHub OAuth code for an access token and stores it.
 */
export async function handleGitHubCallback(code: string, state: string) {
  const { clientId, clientSecret } = getOAuthEnv();
  
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials are not configured.");
  }

  const { organizationId } = validateOAuthState(state);

  // Exchange code for token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Failed to exchange code with GitHub");
  }

  const tokenData = await tokenRes.json();
  
  if (tokenData.error) {
    throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error("No access token received from GitHub");
  }

  // Fetch the authenticated user's profile to get external account details
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ai-incident-commander",
    },
  });

  if (!userRes.ok) {
    throw new Error("Failed to fetch user profile from GitHub");
  }

  const githubUser = await userRes.json();

  // Store the integration securely
  await IntegrationRepository.createOrUpdateIntegration({
    organizationId,
    provider: "GITHUB",
    status: "ACTIVE",
    externalAccountId: String(githubUser.id),
    externalAccountName: githubUser.login,
    accessTokenEncrypted: encryptIntegrationSecret(accessToken),
    scopes: tokenData.scope ? tokenData.scope.split(",") : [],
  });

  return { organizationId, githubUser };
}
