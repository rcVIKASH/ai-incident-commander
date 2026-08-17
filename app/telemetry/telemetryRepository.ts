import crypto from "crypto";
import { telemetryPrisma } from "../db/telemetryDb.js";
import {
  IngestSpanInput,
  IngestLogInput,
  IngestMetricInput,
} from "./telemetryIngestNormalizer.js";

const MAX_BATCH_SIZE = 1000;

function computeHash(parts: any[]): string {
  return crypto
    .createHash("sha256")
    .update(parts.map((p) => (typeof p === "object" ? JSON.stringify(p ?? {}) : String(p ?? ""))).join("|"))
    .digest("hex");
}

export class TelemetryRepository {
  async bulkInsertSpans(
    organizationId: string,
    spans: IngestSpanInput[]
  ): Promise<{ inserted: number }> {
    if (!spans || spans.length === 0) return { inserted: 0 };

    const validSpans = spans
      .filter((s) => s.traceId && s.spanId && s.organizationId === organizationId)
      .slice(0, MAX_BATCH_SIZE);

    if (validSpans.length === 0) return { inserted: 0 };

    const result = await telemetryPrisma.telemetrySpan.createMany({
      data: validSpans.map((s) => ({
        organizationId: s.organizationId,
        traceId: s.traceId,
        spanId: s.spanId,
        parentSpanId: s.parentSpanId,
        serviceName: s.serviceName,
        environment: s.environment,
        operationName: s.operationName,
        spanKind: s.spanKind,
        statusCode: s.statusCode,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMs: s.durationMs,
        attributes: s.attributes as any,
        resourceAttributes: s.resourceAttributes as any,
      })),
      skipDuplicates: true, // Unique constraint: [organizationId, traceId, spanId]
    });

    return { inserted: result.count };
  }

  async bulkInsertLogs(
    organizationId: string,
    logs: IngestLogInput[]
  ): Promise<{ inserted: number }> {
    if (!logs || logs.length === 0) return { inserted: 0 };

    const validLogs = logs
      .filter((l) => l.organizationId === organizationId)
      .slice(0, MAX_BATCH_SIZE);

    if (validLogs.length === 0) return { inserted: 0 };

    const result = await telemetryPrisma.telemetryLog.createMany({
      data: validLogs.map((l) => ({
        organizationId: l.organizationId,
        timestamp: l.timestamp,
        serviceName: l.serviceName,
        environment: l.environment,
        severity: l.severity,
        message: l.message,
        traceId: l.traceId,
        spanId: l.spanId,
        attributes: l.attributes as any,
        resourceAttributes: l.resourceAttributes as any,
        eventHash:
          l.eventHash ||
          computeHash([
            l.organizationId,
            l.environment,
            l.serviceName,
            l.timestamp.toISOString(),
            l.traceId,
            l.spanId,
            l.severity,
            l.message,
            l.attributes,
            l.resourceAttributes,
          ]),
      })),
      skipDuplicates: true, // Unique constraint: [organizationId, eventHash]
    });

    return { inserted: result.count };
  }

  async bulkInsertMetrics(
    organizationId: string,
    metrics: IngestMetricInput[]
  ): Promise<{ inserted: number }> {
    if (!metrics || metrics.length === 0) return { inserted: 0 };

    const validMetrics = metrics
      .filter((m) => m.organizationId === organizationId)
      .slice(0, MAX_BATCH_SIZE);

    if (validMetrics.length === 0) return { inserted: 0 };

    const result = await telemetryPrisma.metricPoint.createMany({
      data: validMetrics.map((m) => ({
        organizationId: m.organizationId,
        timestamp: m.timestamp,
        serviceName: m.serviceName,
        environment: m.environment,
        metricName: m.metricName,
        metricType: m.metricType,
        value: m.value,
        attributes: m.attributes as any,
        resourceAttributes: m.resourceAttributes as any,
        eventHash:
          m.eventHash ||
          computeHash([
            m.organizationId,
            m.environment,
            m.serviceName,
            m.timestamp.toISOString(),
            m.metricName,
            m.metricType,
            m.value,
            m.attributes,
            m.resourceAttributes,
          ]),
      })),
      skipDuplicates: true, // Unique constraint: [organizationId, eventHash]
    });

    return { inserted: result.count };
  }
}
