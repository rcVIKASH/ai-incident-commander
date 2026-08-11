import { Router } from "express";
import { createIncident } from "../controllers/incident.controller.js";

const incidentRouter = Router();

incidentRouter.post("/create", createIncident);

export default incidentRouter;
