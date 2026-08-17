import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as TelemetryPrismaClient } from "./generated/telemetry-prisma/client.js";

const telemetryConnectionString =
  process.env.DATABASE_URL_TELEMETRY || "";

const adapter = new PrismaPg({ connectionString: telemetryConnectionString });
const telemetryPrisma = new TelemetryPrismaClient({ adapter });

export { telemetryPrisma };
