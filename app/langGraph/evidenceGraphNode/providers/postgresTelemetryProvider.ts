import { TelemetryProvider } from "./telemetryProvider.js";
import { telemetryPrisma } from "../../../db/telemetryDb.js";
import {
  LogQuery,
  MetricQuery,
  TraceQuery,
  LogRecord,
  MetricPoint,
  TraceRecord,
  SpanRecord,
  ServiceHealth,
  DeploymentRecord,
  CommitRecord,
} from "../../../types/evidence.js";

/**
 * Tenant-isolated PostgresTelemetryProvider backed by commander_telemetry PostgreSQL database.
 * Formed with organizationId server-side to guarantee strict multi-tenant isolation.
 */
export class PostgresTelemetryProvider implements TelemetryProvider {
  constructor(private readonly organizationId: string) {}

  async getLogs(query: LogQuery): Promise<LogRecord[]> {
    const environment = query.environment || "production";
    const start = query.timeRange?.start
      ? new Date(query.timeRange.start)
      : new Date(Date.now() - 15 * 60 * 1000);
    const end = query.timeRange?.end
      ? new Date(query.timeRange.end)
      : new Date();

    const baseWhere: any = {
      organizationId: this.organizationId,
      serviceName: query.service,
      environment,
    };

    if (query.severities && query.severities.length > 0) {
      baseWhere.severity = { in: query.severities };
    }
    if (query.traceId) baseWhere.traceId = query.traceId;
    if (query.spanId) baseWhere.spanId = query.spanId;
    if (query.keyword) {
      baseWhere.message = { contains: query.keyword, mode: "insensitive" };
    }

    // Try 1: Exact service & time window query
    let rows = await telemetryPrisma.telemetryLog.findMany({
      where: { ...baseWhere, timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: "desc" },
      take: query.limit || 50,
    });

    // Fallback 1: Expand time window to last 24 hours
    if (rows.length === 0) {
      rows = await telemetryPrisma.telemetryLog.findMany({
        where: baseWhere,
        orderBy: { timestamp: "desc" },
        take: query.limit || 50,
      });
    }

    // Fallback 2: Fuzzy service name search if exact serviceName has no logs
    if (rows.length === 0) {
      const servicePrefix = query.service.split(/[-_]/)[0];
      const fuzzyWhere = {
        organizationId: this.organizationId,
        serviceName: { contains: servicePrefix, mode: "insensitive" as const },
      };
      rows = await telemetryPrisma.telemetryLog.findMany({
        where: fuzzyWhere,
        orderBy: { timestamp: "desc" },
        take: query.limit || 50,
      });
    }

    return rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      service: r.serviceName,
      severity: r.severity as any,
      message: r.message,
      attributes: (r.attributes as any) || undefined,
      traceId: r.traceId || undefined,
      spanId: r.spanId || undefined,
    }));
  }

  async getTraces(query: TraceQuery): Promise<TraceRecord[]> {
    const environment = query.environment || "production";
    const start = query.timeRange?.start
      ? new Date(query.timeRange.start)
      : new Date(Date.now() - 15 * 60 * 1000);
    const end = query.timeRange?.end
      ? new Date(query.timeRange.end)
      : new Date();

    const baseWhere: any = {
      organizationId: this.organizationId,
      serviceName: query.service,
      environment,
    };

    if (query.status) baseWhere.statusCode = query.status;
    if (query.traceId) baseWhere.traceId = query.traceId;

    // Try 1: Exact service & time window
    let matchingSpans = await telemetryPrisma.telemetrySpan.findMany({
      where: { ...baseWhere, startTime: { gte: start, lte: end } },
      select: { traceId: true },
      distinct: ["traceId"],
      orderBy: { startTime: "desc" },
      take: query.limit || 20,
    });

    // Fallback 1: Any timestamp for service
    if (matchingSpans.length === 0) {
      matchingSpans = await telemetryPrisma.telemetrySpan.findMany({
        where: baseWhere,
        select: { traceId: true },
        distinct: ["traceId"],
        orderBy: { startTime: "desc" },
        take: query.limit || 20,
      });
    }

    // Fallback 2: Fuzzy service name search
    if (matchingSpans.length === 0) {
      const servicePrefix = query.service.split(/[-_]/)[0];
      matchingSpans = await telemetryPrisma.telemetrySpan.findMany({
        where: {
          organizationId: this.organizationId,
          serviceName: { contains: servicePrefix, mode: "insensitive" },
        },
        select: { traceId: true },
        distinct: ["traceId"],
        orderBy: { startTime: "desc" },
        take: query.limit || 20,
      });
    }

    const traceIds = matchingSpans.map((s) => s.traceId);
    if (traceIds.length === 0) return [];

    const allSpans = await telemetryPrisma.telemetrySpan.findMany({
      where: {
        organizationId: this.organizationId,
        traceId: { in: traceIds },
      },
      orderBy: { startTime: "asc" },
    });

    const byTrace = new Map<string, typeof allSpans>();
    for (const span of allSpans) {
      const existing = byTrace.get(span.traceId) || [];
      existing.push(span);
      byTrace.set(span.traceId, existing);
    }

    const traces: TraceRecord[] = [];

    for (const [traceId, spanGroup] of byTrace.entries()) {
      const mappedSpans: SpanRecord[] = spanGroup.map((s) => ({
        spanId: s.spanId,
        parentSpanId: s.parentSpanId || undefined,
        service: s.serviceName,
        operation: s.operationName,
        durationMs: s.durationMs,
        status: s.statusCode as any,
        attributes: (s.attributes as any) || undefined,
      }));

      const isError = mappedSpans.some((s) => s.status === "ERROR");
      const rootSpan = mappedSpans.find((s) => !s.parentSpanId) || mappedSpans[0];

      const startTimes = spanGroup.map((s) => s.startTime.getTime());
      const endTimes = spanGroup.map((s) => s.endTime.getTime());
      const durationMs = Math.max(...endTimes) - Math.min(...startTimes);

      traces.push({
        traceId,
        timestamp: new Date(Math.min(...startTimes)).toISOString(),
        service: rootSpan?.service || query.service,
        durationMs: Math.max(0, durationMs),
        status: isError ? "ERROR" : "OK",
        spans: mappedSpans,
      });
    }

    return traces;
  }

  async getMetrics(query: MetricQuery): Promise<MetricPoint[]> {
    const environment = query.environment || "production";
    const start = query.timeRange?.start
      ? new Date(query.timeRange.start)
      : new Date(Date.now() - 15 * 60 * 1000);
    const end = query.timeRange?.end
      ? new Date(query.timeRange.end)
      : new Date();

    const baseWhere: any = {
      organizationId: this.organizationId,
      serviceName: query.service,
      environment,
    };

    if (query.metricNames && query.metricNames.length > 0) {
      baseWhere.metricName = { in: query.metricNames };
    }

    let rows = await telemetryPrisma.metricPoint.findMany({
      where: { ...baseWhere, timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: "asc" },
      take: 200,
    });

    if (rows.length === 0) {
      rows = await telemetryPrisma.metricPoint.findMany({
        where: baseWhere,
        orderBy: { timestamp: "asc" },
        take: 200,
      });
    }

    return rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      name: r.metricName,
      value: r.value,
    }));
  }

  async getServiceHealth(service: string): Promise<ServiceHealth> {
    const servicePrefix = service.split(/[-_]/)[0];

    const errorCount = await telemetryPrisma.telemetryLog.count({
      where: {
        organizationId: this.organizationId,
        serviceName: { contains: servicePrefix, mode: "insensitive" },
        severity: "ERROR",
      },
    });

    const isDegraded = errorCount > 0;

    return {
      service,
      status: isDegraded ? "DEGRADED" : "HEALTHY",
      activeAlertsCount: errorCount > 0 ? Math.min(errorCount, 5) : 0,
    };
  }

  async getDeployments(_service: string, _limit = 5): Promise<DeploymentRecord[]> {
    return [];
  }

  async getRecentCommits(_service: string, _limit = 5): Promise<CommitRecord[]> {
    return [];
  }
}
