import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import {
  normalizeOtlpSpans,
  normalizeOtlpLogs,
  normalizeOtlpMetrics,
} from "../telemetry/telemetryIngestNormalizer.js";
import { TelemetryRepository } from "../telemetry/telemetryRepository.js";

const repository = new TelemetryRepository();

export const ingestTraces = wrapAsync(async (req, res) => {
  const organization = req.organization;
  if (!organization) {
    throw new ExpressError("Organization missing from request context", 401);
  }

  const { spans, rejectedCount } = normalizeOtlpSpans(req.body, organization.id);
  const result = await repository.bulkInsertSpans(organization.id, spans);

  console.log(
    `📥 [OTLP Ingest] Received ${spans.length} trace spans from Org "${organization.id}" (${result.inserted} saved, ${rejectedCount} rejected)`
  );

  res.status(200).json({
    partialSuccess: rejectedCount > 0 ? { rejectedRecords: rejectedCount } : {},
  });
});

export const ingestLogs = wrapAsync(async (req, res) => {
  const organization = req.organization;
  if (!organization) {
    throw new ExpressError("Organization missing from request context", 401);
  }

  const { logs, rejectedCount } = normalizeOtlpLogs(req.body, organization.id);
  const result = await repository.bulkInsertLogs(organization.id, logs);

  console.log(
    `📥 [OTLP Ingest] Received ${logs.length} log records from Org "${organization.id}" (${result.inserted} saved, ${rejectedCount} rejected)`
  );

  res.status(200).json({
    partialSuccess: rejectedCount > 0 ? { rejectedRecords: rejectedCount } : {},
  });
});

export const ingestMetrics = wrapAsync(async (req, res) => {
  const organization = req.organization;
  if (!organization) {
    throw new ExpressError("Organization missing from request context", 401);
  }

  const { metrics, rejectedCount } = normalizeOtlpMetrics(req.body, organization.id);
  const result = await repository.bulkInsertMetrics(organization.id, metrics);

  console.log(
    `📥 [OTLP Ingest] Received ${metrics.length} metric points from Org "${organization.id}" (${result.inserted} saved, ${rejectedCount} rejected)`
  );

  res.status(200).json({
    partialSuccess: rejectedCount > 0 ? { rejectedRecords: rejectedCount } : {},
  });
});
