// Real TelemetryProvider implementation backed by an OTLP/JSON HTTP
// endpoint — a Collector's query front-end, Tempo, Loki, or any APM
// backend that returns OTLP-shaped exports. The three query* methods
// below are the only backend-specific part; replace their fetch bodies
// with whatever your actual endpoint expects. Everything that comes
// back gets normalized through otlpAdapter.ts before it leaves this
// class, so evidenceCollector.ts never sees raw OTLP shape.

import { TelemetryProvider } from "./telemetryProvider.js";
import {
  mapOtlpLogs,
  mapOtlpTraces,
  mapOtlpMetrics,
  OtlpResourceLogs,
  OtlpResourceSpans,
  OtlpResourceMetrics,
} from "./otlpAdapter.js";
import {
  LogQuery,
  MetricQuery,
  TraceQuery,
  LogRecord,
  MetricPoint,
  TraceRecord,
  ServiceHealth,
  DeploymentRecord,
  CommitRecord,
} from "../../../types/evidence.js";

export type OtlpTelemetryProviderConfig = {
  /** Base URL of the OTLP-speaking backend, e.g. https://collector.internal:4318 */
  baseUrl: string;
  apiKey?: string;
};

export class OtlpTelemetryProvider implements TelemetryProvider {
  constructor(private readonly config: OtlpTelemetryProviderConfig) {}

  async getLogs(query: LogQuery): Promise<LogRecord[]> {
    return mapOtlpLogs(await this.queryLogs(query));
  }

  async getMetrics(query: MetricQuery): Promise<MetricPoint[]> {
    return mapOtlpMetrics(await this.queryMetrics(query));
  }

  async getTraces(query: TraceQuery): Promise<TraceRecord[]> {
    return mapOtlpTraces(await this.queryTraces(query));
  }

  // Health/deployments/commits aren't OTLP signals — they're optional on
  // TelemetryProvider precisely so a pure-OTLP backend can skip them.
  // Left as explicit throwing stubs (rather than omitted) so it's obvious
  // at the call site that these need a separate uptime/CD/git source if
  // evidenceCollector.ts calls them against this provider.
  async getServiceHealth(service: string): Promise<ServiceHealth> {
    throw new Error(
      `OtlpTelemetryProvider.getServiceHealth("${service}"): not implemented — OTLP has no native health signal, wire this to your uptime/alerting backend.`
    );
  }

  async getDeployments(service: string, limit = 5): Promise<DeploymentRecord[]> {
    throw new Error(
      `OtlpTelemetryProvider.getDeployments("${service}", limit=${limit}): not implemented — wire this to your CD system, not an OTLP source.`
    );
  }

  async getRecentCommits(service: string, limit = 5): Promise<CommitRecord[]> {
    throw new Error(
      `OtlpTelemetryProvider.getRecentCommits("${service}", limit=${limit}): not implemented — wire this to your git host, not an OTLP source.`
    );
  }

  // -------------------------------------------------------------------------
  // Backend calls — replace with your actual OTLP endpoint's request shape.
  // -------------------------------------------------------------------------

  private async queryLogs(query: LogQuery): Promise<OtlpResourceLogs[]> {
    const res = await fetch(`${this.config.baseUrl}/v1/logs/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error(`OTLP logs query failed: ${res.status} ${res.statusText}`);
    const body = (await res.json()) as { resourceLogs?: OtlpResourceLogs[] };
    return body.resourceLogs ?? [];
  }

  private async queryTraces(query: TraceQuery): Promise<OtlpResourceSpans[]> {
    const res = await fetch(`${this.config.baseUrl}/v1/traces/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error(`OTLP traces query failed: ${res.status} ${res.statusText}`);
    const body = (await res.json()) as { resourceSpans?: OtlpResourceSpans[] };
    return body.resourceSpans ?? [];
  }

  private async queryMetrics(query: MetricQuery): Promise<OtlpResourceMetrics[]> {
    const res = await fetch(`${this.config.baseUrl}/v1/metrics/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error(`OTLP metrics query failed: ${res.status} ${res.statusText}`);
    const body = (await res.json()) as { resourceMetrics?: OtlpResourceMetrics[] };
    return body.resourceMetrics ?? [];
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
    };
  }
}
