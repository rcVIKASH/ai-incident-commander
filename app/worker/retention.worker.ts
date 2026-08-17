import { telemetryPrisma } from "../db/telemetryDb.js";

const SPAN_RETENTION_DAYS = 7;
const LOG_RETENTION_DAYS = 3;
const METRIC_RETENTION_DAYS = 14;
const BATCH_SIZE = 5000;

/**
 * Retention worker: purges expired spans, logs, and metrics in bounded SQL batches.
 * Preserves core application database records (users, incidents, organizations).
 */
export async function purgeExpiredTelemetry(): Promise<{
  deletedSpans: number;
  deletedLogs: number;
  deletedMetrics: number;
}> {
  console.log("🧹 [Retention Worker] Running daily telemetry purge job...");

  const now = Date.now();
  const spanCutoff = new Date(now - SPAN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const logCutoff = new Date(now - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const metricCutoff = new Date(now - METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  let deletedSpans = 0;
  let deletedLogs = 0;
  let deletedMetrics = 0;

  try {
    // Purge expired spans in batches
    const expiredSpans = await telemetryPrisma.telemetrySpan.findMany({
      where: { startTime: { lt: spanCutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (expiredSpans.length > 0) {
      const ids = expiredSpans.map((s) => s.id);
      const res = await telemetryPrisma.telemetrySpan.deleteMany({
        where: { id: { in: ids } },
      });
      deletedSpans = res.count;
    }

    // Purge expired logs in batches
    const expiredLogs = await telemetryPrisma.telemetryLog.findMany({
      where: { timestamp: { lt: logCutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (expiredLogs.length > 0) {
      const ids = expiredLogs.map((l) => l.id);
      const res = await telemetryPrisma.telemetryLog.deleteMany({
        where: { id: { in: ids } },
      });
      deletedLogs = res.count;
    }

    // Purge expired metrics in batches
    const expiredMetrics = await telemetryPrisma.metricPoint.findMany({
      where: { timestamp: { lt: metricCutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (expiredMetrics.length > 0) {
      const ids = expiredMetrics.map((m) => m.id);
      const res = await telemetryPrisma.metricPoint.deleteMany({
        where: { id: { in: ids } },
      });
      deletedMetrics = res.count;
    }

    console.log(
      `✅ [Retention Worker] Purge completed: ${deletedSpans} spans, ${deletedLogs} logs, ${deletedMetrics} metrics removed.`
    );

    return { deletedSpans, deletedLogs, deletedMetrics };
  } catch (err: any) {
    console.error("❌ [Retention Worker] Purge error:", err?.message || err);
    return { deletedSpans, deletedLogs, deletedMetrics };
  }
}
