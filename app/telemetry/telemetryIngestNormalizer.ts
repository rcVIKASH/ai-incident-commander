import crypto from "crypto";
import { sanitizeAttributes } from "../utils/privacy.js";

function parseNanoToDate(nanos: string | number | undefined): Date | null {
  if (!nanos) return null;
  try {
    const numNanos = typeof nanos === "string" ? BigInt(nanos) : BigInt(nanos);
    const ms = Number(numNanos / 1_000_000n);
    if (isNaN(ms) || ms <= 0) return null;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function computeEventHash(parts: (string | number | object | undefined | null)[]): string {
  const canonical = parts
    .map((p) => (typeof p === "object" ? JSON.stringify(p ?? {}) : String(p ?? "")))
    .join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function otlpValueToAttribute(value: any): any {
  if (!value || typeof value !== "object") return value;
  if ("stringValue" in value) return value.stringValue;
  if ("boolValue" in value) return value.boolValue;
  if ("intValue" in value) return Number(value.intValue);
  if ("doubleValue" in value) return value.doubleValue;
  return String(value);
}

function mapAttributesMap(attrs?: any[]): Record<string, any> | undefined {
  if (!attrs || !Array.isArray(attrs) || attrs.length === 0) return undefined;
  const out: Record<string, any> = {};
  for (const { key, value } of attrs) {
    if (key) out[key] = otlpValueToAttribute(value);
  }
  return sanitizeAttributes(out) || undefined;
}

function extractResourceService(resource?: any): string {
  const attrs = resource?.attributes || [];
  const match = attrs.find((a: any) => a.key === "service.name");
  return match ? String(otlpValueToAttribute(match.value)) : "unknown-service";
}

function extractResourceEnvironment(resource?: any): string {
  const attrs = resource?.attributes || [];
  const match = attrs.find(
    (a: any) => a.key === "deployment.environment.name" || a.key === "environment"
  );
  return match ? String(otlpValueToAttribute(match.value)) : "production";
}

export type IngestSpanInput = {
  organizationId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  environment: string;
  operationName: string;
  spanKind?: string;
  statusCode: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  attributes?: Record<string, any>;
  resourceAttributes?: Record<string, any>;
};

export type NormalizeSpansResult = {
  spans: IngestSpanInput[];
  rejectedCount: number;
};

export function normalizeOtlpSpans(
  body: any,
  organizationId: string
): NormalizeSpansResult {
  const spans: IngestSpanInput[] = [];
  let rejectedCount = 0;
  const resourceSpans = body?.resourceSpans || body?.resource_spans || [];

  for (const rs of resourceSpans) {
    const serviceName = extractResourceService(rs.resource);
    const environment = extractResourceEnvironment(rs.resource);
    const resourceAttrs = mapAttributesMap(rs.resource?.attributes);

    for (const scope of rs.scopeSpans || rs.scope_spans || []) {
      for (const span of scope.spans || []) {
        const startTime = parseNanoToDate(span.startTimeUnixNano || span.start_time_unix_nano);
        const endTime = parseNanoToDate(span.endTimeUnixNano || span.end_time_unix_nano);

        if (!startTime || !endTime) {
          rejectedCount++;
          continue;
        }

        const durationMs = Math.max(0, endTime.getTime() - startTime.getTime());
        const statusCodeNum = span.status?.code ?? 0;
        const statusCodeStr = statusCodeNum === 2 ? "ERROR" : statusCodeNum === 1 ? "OK" : "UNSET";

        spans.push({
          organizationId,
          traceId: span.traceId || span.trace_id || "",
          spanId: span.spanId || span.span_id || "",
          parentSpanId: span.parentSpanId || span.parent_span_id || undefined,
          serviceName,
          environment,
          operationName: span.name || "unnamed_operation",
          spanKind: span.kind ? String(span.kind) : undefined,
          statusCode: statusCodeStr,
          startTime,
          endTime,
          durationMs,
          attributes: mapAttributesMap(span.attributes),
          resourceAttributes: resourceAttrs,
        });
      }
    }
  }

  return { spans, rejectedCount };
}

export type IngestLogInput = {
  organizationId: string;
  timestamp: Date;
  serviceName: string;
  environment: string;
  severity: string;
  message: string;
  traceId?: string;
  spanId?: string;
  attributes?: Record<string, any>;
  resourceAttributes?: Record<string, any>;
  eventHash?: string;
};

export type NormalizeLogsResult = {
  logs: IngestLogInput[];
  rejectedCount: number;
};

export function normalizeOtlpLogs(
  body: any,
  organizationId: string
): NormalizeLogsResult {
  const logs: IngestLogInput[] = [];
  let rejectedCount = 0;
  const resourceLogs = body?.resourceLogs || body?.resource_logs || [];

  for (const rl of resourceLogs) {
    const serviceName = extractResourceService(rl.resource);
    const environment = extractResourceEnvironment(rl.resource);
    const resourceAttrs = mapAttributesMap(rl.resource?.attributes);

    for (const scope of rl.scopeLogs || rl.scope_logs || []) {
      for (const rec of scope.logRecords || scope.log_records || []) {
        const timestamp = parseNanoToDate(rec.timeUnixNano || rec.time_unix_nano);
        if (!timestamp) {
          rejectedCount++;
          continue;
        }

        const severity = (rec.severityText || rec.severity_text || "INFO").toUpperCase();
        const message = rec.body ? String(otlpValueToAttribute(rec.body)) : "";
        const traceId = rec.traceId || rec.trace_id || undefined;
        const spanId = rec.spanId || rec.span_id || undefined;
        const attributes = mapAttributesMap(rec.attributes);

        const eventHash = computeEventHash([
          organizationId,
          environment,
          serviceName,
          timestamp.toISOString(),
          traceId,
          spanId,
          severity,
          message,
          attributes,
          resourceAttrs,
        ]);

        logs.push({
          organizationId,
          timestamp,
          serviceName,
          environment,
          severity,
          message,
          traceId,
          spanId,
          attributes,
          resourceAttributes: resourceAttrs,
          eventHash,
        });
      }
    }
  }

  return { logs, rejectedCount };
}

export type IngestMetricInput = {
  organizationId: string;
  timestamp: Date;
  serviceName: string;
  environment: string;
  metricName: string;
  metricType: string;
  value: number;
  attributes?: Record<string, any>;
  resourceAttributes?: Record<string, any>;
  eventHash?: string;
};

export type NormalizeMetricsResult = {
  metrics: IngestMetricInput[];
  rejectedCount: number;
};

export function normalizeOtlpMetrics(
  body: any,
  organizationId: string
): NormalizeMetricsResult {
  const metrics: IngestMetricInput[] = [];
  let rejectedCount = 0;
  const resourceMetrics = body?.resourceMetrics || body?.resource_metrics || [];

  for (const rm of resourceMetrics) {
    const serviceName = extractResourceService(rm.resource);
    const environment = extractResourceEnvironment(rm.resource);
    const resourceAttrs = mapAttributesMap(rm.resource?.attributes);

    for (const scope of rm.scopeMetrics || rm.scope_metrics || []) {
      for (const metric of scope.metrics || []) {
        const metricName = metric.name || "unnamed_metric";
        const dataPoints = metric.gauge?.dataPoints || metric.sum?.dataPoints || metric.gauge?.data_points || metric.sum?.data_points || [];
        const metricType = metric.gauge ? "gauge" : metric.sum ? "sum" : "unknown";

        for (const dp of dataPoints) {
          const timestamp = parseNanoToDate(dp.timeUnixNano || dp.time_unix_nano);
          if (!timestamp) {
            rejectedCount++;
            continue;
          }

          const value = dp.asDouble ?? dp.as_double ?? (dp.asInt !== undefined ? Number(dp.asInt) : dp.as_int !== undefined ? Number(dp.as_int) : 0);
          const attributes = mapAttributesMap(dp.attributes);

          const eventHash = computeEventHash([
            organizationId,
            environment,
            serviceName,
            timestamp.toISOString(),
            metricName,
            metricType,
            value,
            attributes,
            resourceAttrs,
          ]);

          metrics.push({
            organizationId,
            timestamp,
            serviceName,
            environment,
            metricName,
            metricType,
            value: Number(value),
            attributes,
            resourceAttributes: resourceAttrs,
            eventHash,
          });
        }
      }
    }
  }

  return { metrics, rejectedCount };
}
