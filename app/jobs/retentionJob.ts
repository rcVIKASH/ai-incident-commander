import cron from "node-cron";
import { purgeExpiredTelemetry } from "../worker/retention.worker.js";

export function startRetentionJob() {
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running telemetry retention...");
    await purgeExpiredTelemetry();
  });
}