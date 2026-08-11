import express, { Request, Response, NextFunction } from "express";
import ExpressError from "./utils/expressError.js";
import userRouter from "./router/user.router.js";
import incidentRouter from "./router/incident.router.js";
import organizationRouter from "./router/organization.router.js";
import apiKeyRouter from "./router/apiKey.router.js";

const app = express();

// middleware
app.use(express.json());

// routes
app.use("/api/users", userRouter);
app.use("/api/incidents", incidentRouter);
app.use("/api/organizations", organizationRouter);
app.use("/api/api-keys", apiKeyRouter);


// 404 handler — must come AFTER all routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next(
    new ExpressError(`Route not found: ${req.method} ${req.originalUrl}`, 404),
  );
});

// Global error handler — must be LAST
app.use(
  (err: ExpressError, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.status || 500;

    res.status(statusCode).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  },
);

export default app;
