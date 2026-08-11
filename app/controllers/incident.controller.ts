import wrapAsync from "../utils/warpAsync.js";
import { incidentSchema } from "../validators/incident.validation.js";
import { createIncidentService } from "../services/incident.service.js";

export const createIncident = wrapAsync(async (req, res) => {
  const data = incidentSchema.parse(req.body);

  const incident = await createIncidentService(data);

  res.status(201).json(incident);
});