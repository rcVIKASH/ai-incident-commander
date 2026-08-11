import { prisma } from "../db/config.js";
import { IncidentCreateInput } from "../validators/incident.validation.js";

export const createIncidentService = async (data: IncidentCreateInput) => {
  return prisma.incident.create({
    data,
  });
};
