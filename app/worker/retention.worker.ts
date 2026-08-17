import { telemetryPrisma } from "../db/telemetryDb.js";

const SPAN_RETENTION_DAYS = 7;
const LOG_RETENTION_DAYS = 3;
const METRIC_RETENTION_DAYS = 14;

const BATCH_SIZE = 5000;
const MAX_LOOP_ITERATIONS = 50;
const ADVISORY_LOCK_ID = 892147102;

type PurgeResult = {
  deletedSpans: number;
  deletedLogs: number;
  deletedMetrics: number;
};

/**
 * Retention worker:
 * - Deletes expired spans, logs and metrics in batches.
 * - Uses a PostgreSQL transaction-level advisory lock.
 * - Only one retention worker can run at a time.
 * - Fails safely if the lock cannot be acquired.
 */
export async function purgeExpiredTelemetry(): Promise<PurgeResult> {
  console.log("🧹 [Retention Worker] Starting telemetry purge...");

  try {
    const result = await telemetryPrisma.$transaction(
      async (tx) => {
        // --------------------------------------------------
        // 1. Acquire transaction-level advisory lock
        // --------------------------------------------------
        const lockResult = await tx.$queryRaw<
          { acquired: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(${ADVISORY_LOCK_ID}) AS acquired`;

        const hasLock = Boolean(lockResult?.[0]?.acquired);

        if (!hasLock) {
          console.log(
            "🔒 [Retention Worker] Another retention worker is already running. Skipping.",
          );

          return {
            deletedSpans: 0,
            deletedLogs: 0,
            deletedMetrics: 0,
          };
        }

        // --------------------------------------------------
        // 2. Calculate retention cutoffs
        // --------------------------------------------------
        const now = Date.now();

        const spanCutoff = new Date(
          now - SPAN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        );

        const logCutoff = new Date(
          now - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        );

        const metricCutoff = new Date(
          now - METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        );

        let deletedSpans = 0;
        let deletedLogs = 0;
        let deletedMetrics = 0;

        // --------------------------------------------------
        // 3. Delete expired spans
        // --------------------------------------------------
        let iterations = 0;

        while (iterations < MAX_LOOP_ITERATIONS) {
          iterations++;

          const expiredSpans = await tx.telemetrySpan.findMany({
            where: {
              startTime: {
                lt: spanCutoff,
              },
            },
            select: {
              id: true,
            },
            orderBy: {
              startTime: "asc",
            },
            take: BATCH_SIZE,
          });

          if (expiredSpans.length === 0) {
            break;
          }

          const ids = expiredSpans.map((span) => span.id);

          const result = await tx.telemetrySpan.deleteMany({
            where: {
              id: {
                in: ids,
              },
            },
          });

          deletedSpans += result.count;

          if (result.count < BATCH_SIZE) {
            break;
          }
        }

        // --------------------------------------------------
        // 4. Delete expired logs
        // --------------------------------------------------
        iterations = 0;

        while (iterations < MAX_LOOP_ITERATIONS) {
          iterations++;

          const expiredLogs = await tx.telemetryLog.findMany({
            where: {
              timestamp: {
                lt: logCutoff,
              },
            },
            select: {
              id: true,
            },
            orderBy: {
              timestamp: "asc",
            },
            take: BATCH_SIZE,
          });

          if (expiredLogs.length === 0) {
            break;
          }

          const ids = expiredLogs.map((log) => log.id);

          const result = await tx.telemetryLog.deleteMany({
            where: {
              id: {
                in: ids,
              },
            },
          });

          deletedLogs += result.count;

          if (result.count < BATCH_SIZE) {
            break;
          }
        }

        // --------------------------------------------------
        // 5. Delete expired metrics
        // --------------------------------------------------
        iterations = 0;

        while (iterations < MAX_LOOP_ITERATIONS) {
          iterations++;

          const expiredMetrics = await tx.metricPoint.findMany({
            where: {
              timestamp: {
                lt: metricCutoff,
              },
            },
            select: {
              id: true,
            },
            orderBy: {
              timestamp: "asc",
            },
            take: BATCH_SIZE,
          });

          if (expiredMetrics.length === 0) {
            break;
          }

          const ids = expiredMetrics.map((metric) => metric.id);

          const result = await tx.metricPoint.deleteMany({
            where: {
              id: {
                in: ids,
              },
            },
          });

          deletedMetrics += result.count;

          if (result.count < BATCH_SIZE) {
            break;
          }
        }

        return {
          deletedSpans,
          deletedLogs,
          deletedMetrics,
        };
      },
      {
        // The transaction can contain multiple batches.
        // Give it enough time for large cleanup jobs.
        timeout: 120_000,
      },
    );

    console.log(
      `✅ [Retention Worker] Purge completed: ` +
        `${result.deletedSpans} spans, ` +
        `${result.deletedLogs} logs, ` +
        `${result.deletedMetrics} metrics removed.`,
    );

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    console.error("❌ [Retention Worker] Purge failed:", message);

    // Fail safely. Never pretend cleanup succeeded.
    return {
      deletedSpans: 0,
      deletedLogs: 0,
      deletedMetrics: 0,
    };
  }
}
