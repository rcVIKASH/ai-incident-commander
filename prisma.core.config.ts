import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/core/schema.prisma",
  migrations: {
    path: "prisma/core/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
