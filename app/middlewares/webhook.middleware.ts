import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/config.js";

export const webhookApi = async (
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

  const organization = await prisma.organization.findFirst({
    where: {
      apiKeyHash: apiKey,
    },
  });

  if (!organization) {
    return res.status(401).json({
      message: "Invalid API key",
    });
  }

  req.organization = organization;

  next();
};