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



  // need to implement api key hashing and compare with hashed value in db

  const keyRecord = await prisma.apiKey.findUnique({
    where: {
      keyHash: apiKey,
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

  req.organization = keyRecord.organization;

  next();
};