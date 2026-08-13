import { prisma } from "../db/config.js";
import { IncidentCreateInput } from "../validators/incident.validation.js";
import { publishIncident } from "../pubSub/publisher.js";

export const createIncidentService = async (data: IncidentCreateInput) => {
  const incident = await prisma.incident.create({
    data,
  });

  // Publish incident event to RabbitMQ to trigger LangGraph processing
  await publishIncident(incident);

  return incident;
};
