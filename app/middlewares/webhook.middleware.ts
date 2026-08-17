import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/config.js";

export const webhookMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.header("x-api-key");

  if (!apiKey) {
    return res.status(401).json({
      message: "Missing API key",
    });
  }

  // Hash incoming raw API key to compare with stored SHA-256 keyHash
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const keyRecord = await prisma.apiKey.findUnique({
    where: {
      keyHash,
    },
    include: {
      organization: true,
    },
  });

  if (!keyRecord || !keyRecord.organization) {
    return res.status(401).json({
      message: "Invalid API key",
    });
  }

  if (keyRecord.scope !== "ALERT_WEBHOOK") {
    return res.status(403).json({
      message: 'API key scope must be "ALERT_WEBHOOK" to send incident webhooks',
    });
  }

  // Check if key is revoked
  if (keyRecord.revokedAt) {
    return res.status(401).json({
      message: "API key has been revoked",
    });
  }

  // Check if key is expired
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return res.status(401).json({
      message: "API key has expired",
    });
  }

  // Update lastUsedAt asynchronously
  prisma.apiKey
    .update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => { });

  req.organization = keyRecord.organization;

  next();
};
