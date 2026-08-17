import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/telemetry/schema.prisma",
  migrations: {
    path: "prisma/telemetry/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL_TELEMETRY"] || process.env["TELEMETRY_DATABASE_URL"],
  },
});
