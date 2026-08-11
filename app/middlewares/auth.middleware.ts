import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import ExpressError from "../utils/expressError.js";
import wrapAsync from "../utils/warpAsync.js";
import { prisma } from "../db/config.js";
import { AuthUser } from "../types/userType.js";

const authMiddleware = wrapAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get token from cookie or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new ExpressError("Unauthorized access: No token provided", 401);
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new ExpressError("JWT secret is not configured", 500);
    }

    let decoded: AuthUser;

    try {
      decoded = jwt.verify(token, secret) as AuthUser;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ExpressError("Token has expired", 401);
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new ExpressError("Invalid token", 401);
      }

      throw error;
    }

    // Make sure the user still exists
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user) {
      throw new ExpressError("Unauthorized access: User not found", 401);
    }

    // Attach authenticated user information to request
    req.user = decoded;

    next();
  },
);

export default authMiddleware;
