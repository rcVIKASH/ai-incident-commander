import crypto from "crypto";
import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { prisma } from "../db/config.js";
import { generateApiKeySchema } from "../validators/apiKey.validation.js";

export const generateApiKey = wrapAsync(async (req, res) => {
  // 1. Validate request body
  const data = generateApiKeySchema.parse(req.body);
  const { name, expiresInDays, organizationId: requestedOrganizationId } = data;

  // 2. Determine organization
  const organizationId = requestedOrganizationId || req.user?.organizationId;

  if (!organizationId) {
    throw new ExpressError(
      "Organization ID is required to generate an API key",
      400,
    );
  }

  // 3. Verify authenticated user belongs to the organization
  if (req.user?.organizationId !== organizationId) {
    throw new ExpressError(
      "You do not have permission to generate an API key for this organization",
      403,
    );
  }

  // 4. Only OWNER and ADMIN can generate API keys
  if (!["OWNER", "ADMIN"].includes(req.user?.role)) {
    throw new ExpressError(
      "Only organization owners and admins can generate API keys",
      403,
    );
  }

  // 5. Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!organization) {
    throw new ExpressError("Organization not found", 404);
  }

  // 6. Generate secure random API key
  const rawKey = `aic_live_${crypto.randomBytes(24).toString("hex")}`;

  // Never store the raw API key
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  // 7. Calculate expiration date
  let expiresAt: Date | undefined;

  if (expiresInDays !== undefined && expiresInDays !== null) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  // 8. Store API key
  const apiKeyRecord = await prisma.apiKey.create({
    data: {
      name,
      keyHash,
      organizationId,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // 9. Return API key
  // IMPORTANT: rawKey is only available at creation time.
  res.status(201).json({
    success: true,
    message: "API key generated successfully",
    apiKey: rawKey,
    keyDetails: apiKeyRecord,
  });
});
