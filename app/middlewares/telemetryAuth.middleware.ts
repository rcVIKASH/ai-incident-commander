import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/config.js";

export const telemetryAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Support both x-api-key and Authorization: Bearer <key>
  let rawKey = req.header("x-api-key");

  const authHeader = req.header("authorization");
  if (!rawKey && authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    rawKey = authHeader.slice(7).trim();
  }

  if (!rawKey) {
    return res.status(401).json({
      message: "Missing API key in Authorization: Bearer <key> or x-api-key header",
    });
  }

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const keyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { organization: true },
  });

  if (!keyRecord || !keyRecord.organization) {
    return res.status(401).json({
      message: "Invalid telemetry API key",
    });
  }

  if (keyRecord.scope !== "TELEMETRY_INGEST") {
    return res.status(403).json({
      message: `API key scope "${keyRecord.scope}" cannot ingest telemetry. Must have "TELEMETRY_INGEST" scope.`,
    });
  }

  if (keyRecord.revokedAt) {
    return res.status(401).json({
      message: "API key has been revoked",
    });
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return res.status(401).json({
      message: "API key has expired",
    });
  }

  // Asynchronously update lastUsedAt
  prisma.apiKey
    .update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  req.organization = keyRecord.organization;
  next();
};
