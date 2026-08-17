import { telemetryPrisma } from "../db/telemetryDb.js";

const SPAN_RETENTION_DAYS = 7;
const LOG_RETENTION_DAYS = 3;
const METRIC_RETENTION_DAYS = 14;
const BATCH_SIZE = 5000;
const MAX_LOOP_ITERATIONS = 50;
const ADVISORY_LOCK_ID = 892147102;

/**
 * Retention worker: purges expired spans, logs, and metrics in bounded SQL batches.
 * Uses a PostgreSQL advisory lock to ensure only one worker runs at a time,
 * and loops until all expired rows are purged.
 */
export async function purgeExpiredTelemetry(): Promise<{
  deletedSpans: number;
  deletedLogs: number;
  deletedMetrics: number;
}> {
  console.log("🧹 [Retention Worker] Attempting telemetry purge job...");

  // Try to acquire PostgreSQL advisory lock
  let hasLock = false;
  try {
    const lockRes = await telemetryPrisma.$queryRaw<
      { pg_try_advisory_lock: boolean }[]
    >`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID})`;

    hasLock = Boolean(lockRes?.[0]?.pg_try_advisory_lock);
  } catch (err: any) {
    console.warn("⚠️ [Retention Worker] Could not evaluate advisory lock, proceeding without lock:", err?.message || err);
    hasLock = true; // Fallback if DB doesn't support advisory lock
  }

  if (!hasLock) {
    console.log("🔒 [Retention Worker] Lock active — another worker is running retention purge. Skipping.");
    return { deletedSpans: 0, deletedLogs: 0, deletedMetrics: 0 };
  }

  let deletedSpans = 0;
  let deletedLogs = 0;
  let deletedMetrics = 0;

  try {
    const now = Date.now();
    const spanCutoff = new Date(now - SPAN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const logCutoff = new Date(now - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const metricCutoff = new Date(now - METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Loop until all expired spans are deleted
    let iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      iterations++;
      const expiredSpans = await telemetryPrisma.telemetrySpan.findMany({
        where: { startTime: { lt: spanCutoff } },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (expiredSpans.length === 0) break;

      const ids = expiredSpans.map((s) => s.id);
      const res = await telemetryPrisma.telemetrySpan.deleteMany({
        where: { id: { in: ids } },
      });
      deletedSpans += res.count;
      if (res.count < BATCH_SIZE) break;
    }

    // Loop until all expired logs are deleted
    iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      iterations++;
      const expiredLogs = await telemetryPrisma.telemetryLog.findMany({
        where: { timestamp: { lt: logCutoff } },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (expiredLogs.length === 0) break;

      const ids = expiredLogs.map((l) => l.id);
      const res = await telemetryPrisma.telemetryLog.deleteMany({
        where: { id: { in: ids } },
      });
      deletedLogs += res.count;
      if (res.count < BATCH_SIZE) break;
    }

    // Loop until all expired metrics are deleted
    iterations = 0;
    while (iterations < MAX_LOOP_ITERATIONS) {
      iterations++;
      const expiredMetrics = await telemetryPrisma.metricPoint.findMany({
        where: { timestamp: { lt: metricCutoff } },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (expiredMetrics.length === 0) break;

      const ids = expiredMetrics.map((m) => m.id);
      const res = await telemetryPrisma.metricPoint.deleteMany({
        where: { id: { in: ids } },
      });
      deletedMetrics += res.count;
      if (res.count < BATCH_SIZE) break;
    }

    console.log(
      `✅ [Retention Worker] Purge completed: ${deletedSpans} spans, ${deletedLogs} logs, ${deletedMetrics} metrics removed.`
    );
  } catch (err: any) {
    console.error("❌ [Retention Worker] Purge error:", err?.message || err);
  } finally {
    if (hasLock) {
      try {
        await telemetryPrisma.$queryRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`;
      } catch {
        // Ignore lock release errors
      }
    }
  }

  return { deletedSpans, deletedLogs, deletedMetrics };
}
