import {
  RawEvidence,
  ProcessedEvidence,
  LogRecord,
  MetricPoint,
  TraceRecord,
} from "../../types/evidence.js";

/**
 * Pure evidence calculation engine.
 * Converts raw telemetry signals (logs, metrics, traces, health, deployments, commits) into calculated, aggregated evidence
 * designed specifically for LLM context optimization (minimizes tokens, maximizes signal).
 */
export function processEvidence(raw: RawEvidence): ProcessedEvidence {
  const logsSummary = processLogs(raw.logs);
  const metricsSummary = processMetrics(raw.metrics);
  const tracesSummary = processTraces(raw.traces);

  const healthSummary = raw.health;
  const deploymentsSummary = raw.deployments
    ? {
        latestVersion: raw.deployments[0]?.version,
        recentCount: raw.deployments.length,
        lastDeployedAt: raw.deployments[0]?.timestamp,
      }
    : undefined;

  const commitsSummary = raw.commits
    ? {
        recentCount: raw.commits.length,
        topMessages: raw.commits.map((c) => `[${c.hash.slice(0, 7)}] ${c.message}`),
      }
    : undefined;

  const summaryText = buildEvidenceSummaryText(
    logsSummary,
    metricsSummary,
    tracesSummary,
    healthSummary,
    deploymentsSummary,
    commitsSummary
  );

  return {
    summaryText,
    logs: logsSummary,
    metrics: metricsSummary,
    traces: tracesSummary,
    health: healthSummary,
    deployments: deploymentsSummary,
    commits: commitsSummary,
  };
}

/**
 * Calculates log error aggregations and top error signatures
 */
function processLogs(logs: LogRecord[]) {
  let totalErrors = 0;
  let totalWarnings = 0;
  const messageCounts: Record<string, number> = {};

  for (const log of logs) {
    if (log.severity === "ERROR") {
      totalErrors++;
      const key = log.message.trim();
      messageCounts[key] = (messageCounts[key] || 0) + 1;
    } else if (log.severity === "WARN") {
      totalWarnings++;
    }
  }

  const topErrors = Object.entries(messageCounts)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalErrors,
    totalWarnings,
    topErrors,
  };
}

/**
 * Calculates metric baselines, peaks, latest values, and percentage changes (Δ%)
 */
function processMetrics(metrics: MetricPoint[]) {
  const grouped: Record<string, MetricPoint[]> = {};

  for (const point of metrics) {
    if (!grouped[point.name]) {
      grouped[point.name] = [];
    }
    grouped[point.name].push(point);
  }

  return Object.entries(grouped).map(([name, points]) => {
    // Sort points by timestamp ascending
    points.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const values = points.map((p) => p.value);
    const baseline = values.length > 0 ? values[0] : 0;
    const peak = values.length > 0 ? Math.max(...values) : 0;
    const latest = values.length > 0 ? values[values.length - 1] : 0;

    let changePercent = 0;
    if (baseline !== 0) {
      changePercent = parseFloat((((peak - baseline) / baseline) * 100).toFixed(2));
    }

    const anomalyDetected = Math.abs(changePercent) >= 50 || peak > 1000;

    return {
      name,
      baseline,
      peak,
      latest,
      changePercent,
      anomalyDetected,
    };
  });
}

/**
 * Calculates trace failure statistics, p95 duration, and failure span paths
 */
function processTraces(traces: TraceRecord[]) {
  const total = traces.length;
  const failedTraces = traces.filter((t) => t.status === "ERROR");
  const failedCount = failedTraces.length;
  const errorRatePercent =
    total > 0 ? parseFloat(((failedCount / total) * 100).toFixed(2)) : 0;

  // Calculate p95 duration
  const durations = traces.map((t) => t.durationMs).sort((a, b) => a - b);
  const p95Index = Math.floor(durations.length * 0.95);
  const p95DurationMs = durations.length > 0 ? durations[p95Index] || durations[durations.length - 1] : 0;

  // Extract unique failure span paths
  const failurePathStrings = new Set<string>();
  const commonFailurePaths: string[][] = [];

  for (const trace of failedTraces) {
    const errorSpans = trace.spans.filter((s) => s.status === "ERROR");
    const path = errorSpans.map((s) => `${s.service}:${s.operation}`);

    if (path.length > 0) {
      const pathKey = path.join(" -> ");
      if (!failurePathStrings.has(pathKey)) {
        failurePathStrings.add(pathKey);
        commonFailurePaths.push(path);
      }
    }
  }

  return {
    total,
    failed: failedCount,
    errorRatePercent,
    p95DurationMs,
    commonFailurePaths,
  };
}

/**
 * Builds compact human/LLM-readable summary string of calculated evidence
 */
function buildEvidenceSummaryText(
  logs: ReturnType<typeof processLogs>,
  metrics: ReturnType<typeof processMetrics>,
  traces: ReturnType<typeof processTraces>,
  health?: RawEvidence["health"],
  deployments?: ProcessedEvidence["deployments"],
  commits?: ProcessedEvidence["commits"]
): string {
  const lines: string[] = [];

  lines.push(`--- CALCULATED TELEMETRY EVIDENCE SUMMARY ---`);

  if (health) {
    lines.push(`[SERVICE HEALTH]`);
    lines.push(`• Service Status: ${health.status}, Active Alerts: ${health.activeAlertsCount}, Uptime: ${health.uptimePercent}%`);
    if (health.lastDeploymentAt) {
      lines.push(`• Last Deployment: ${health.lastDeploymentAt}`);
    }
  }

  // Logs summary
  lines.push(`\n[LOGS EVIDENCE]`);
  lines.push(`• Total Errors: ${logs.totalErrors}, Total Warnings: ${logs.totalWarnings}`);
  if (logs.topErrors.length > 0) {
    lines.push(`• Top Error Signatures:`);
    for (const err of logs.topErrors) {
      lines.push(`  - (${err.count}x) ${err.message}`);
    }
  }

  // Metrics summary
  lines.push(`\n[METRICS EVIDENCE]`);
  for (const m of metrics) {
    const anomalyTag = m.anomalyDetected ? " [ANOMALY SPIKE]" : "";
    lines.push(
      `• ${m.name}: baseline=${m.baseline}, peak=${m.peak}, latest=${m.latest} (Change: ${m.changePercent}%)${anomalyTag}`
    );
  }

  // Traces summary
  lines.push(`\n[TRACES EVIDENCE]`);
  lines.push(
    `• Total Traces: ${traces.total}, Failed: ${traces.failed} (${traces.errorRatePercent}% error rate), p95 Duration: ${traces.p95DurationMs}ms`
  );
  if (traces.commonFailurePaths.length > 0) {
    lines.push(`• Common Failure Span Paths:`);
    for (const path of traces.commonFailurePaths) {
      lines.push(`  - ${path.join(" -> ")}`);
    }
  }

  if (deployments && deployments.recentCount > 0) {
    lines.push(`\n[DEPLOYMENTS CONTEXT]`);
    lines.push(`• Recent Releases: ${deployments.recentCount}, Latest Version: ${deployments.latestVersion || "N/A"}`);
  }

  if (commits && commits.recentCount > 0) {
    lines.push(`\n[RECENT COMMITS CONTEXT]`);
    lines.push(`• Recent Commits: ${commits.recentCount}`);
    for (const msg of commits.topMessages.slice(0, 3)) {
      lines.push(`  - ${msg}`);
    }
  }

  return lines.join("\n");
}
