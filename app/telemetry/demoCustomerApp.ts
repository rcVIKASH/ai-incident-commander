import "dotenv/config";
import { prisma } from "../db/config.js";
import crypto from "crypto";

/**
 * Customer Demo Script:
 * 1. Provisions a test Organization and a TELEMETRY_INGEST API Key.
 * 2. Generates correlated OTLP/HTTP JSON traces, logs, and metrics for a payment outage.
 * 3. Ingests them via bulk repository insert into commander_telemetry.
 */
export async function seedDemoTelemetry(): Promise<{ organizationId: string; apiKey: string }> {
  console.log("--------------------------------------------------");
  console.log("🚀 Seeding Production-Grade Telemetry into commander_telemetry");
  console.log("--------------------------------------------------\n");

  // 1. Create or retrieve demo Organization
  let org = await prisma.organization.findUnique({
    where: { slug: "demo-saas-org" },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Demo SaaS Inc.",
        slug: "demo-saas-org",
        description: "Customer SaaS app pushing telemetry",
      },
    });
  }

  // 2. Generate or retrieve TELEMETRY_INGEST API Key
  const rawKey = "demo_telemetry_key_secret_99812";
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  let apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKeyRecord) {
    apiKeyRecord = await prisma.apiKey.create({
      data: {
        name: "OTel Ingestion Key",
        keyHash,
        organizationId: org.id,
        scope: "TELEMETRY_INGEST",
      },
    });
  }

  const { TelemetryRepository } = await import("./telemetryRepository.js");
  const repository = new TelemetryRepository();

  const serviceName = "payment-gateway";
  const environment = "production";
  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60 * 1000);
  const traceId = "trace-checkout-db-timeout-8891";
  const rootSpanId = "span-api-gateway-001";
  const checkoutSpanId = "span-payment-service-002";
  const dbSpanId = "span-payment-db-003";

  // 3. Spans: Payment Gateway -> DB Timeout failure
  await repository.bulkInsertSpans(org.id, [
    {
      organizationId: org.id,
      traceId,
      spanId: rootSpanId,
      serviceName: "api-gateway",
      environment,
      operationName: "POST /v1/payments/checkout",
      statusCode: "ERROR",
      startTime,
      endTime: new Date(startTime.getTime() + 2450),
      durationMs: 2450,
      attributes: { "http.status_code": 504 },
    },
    {
      organizationId: org.id,
      traceId,
      spanId: checkoutSpanId,
      parentSpanId: rootSpanId,
      serviceName,
      environment,
      operationName: "processPayment",
      statusCode: "ERROR",
      startTime: new Date(startTime.getTime() + 50),
      endTime: new Date(startTime.getTime() + 2400),
      durationMs: 2350,
      attributes: { "payment.provider": "stripe" },
    },
    {
      organizationId: org.id,
      traceId,
      spanId: dbSpanId,
      parentSpanId: checkoutSpanId,
      serviceName: "payment-db",
      environment,
      operationName: "SELECT FOR UPDATE accounts",
      statusCode: "ERROR",
      startTime: new Date(startTime.getTime() + 100),
      endTime: new Date(startTime.getTime() + 2100),
      durationMs: 2000,
      attributes: { "db.error": "PoolExhausted", "authorization": "Bearer secret-token" }, // Will be sanitized
    },
  ]);

  // 4. Correlated Logs linking traceId & spanId
  await repository.bulkInsertLogs(org.id, [
    {
      organizationId: org.id,
      timestamp: new Date(startTime.getTime() + 2000),
      serviceName,
      environment,
      severity: "ERROR",
      message: "Connection pool exhausted: active connections 50/50, queue size limit exceeded",
      traceId,
      spanId: checkoutSpanId,
      attributes: { "db.name": "payment_db" },
    },
    {
      organizationId: org.id,
      timestamp: new Date(startTime.getTime() + 2100),
      serviceName,
      environment,
      severity: "ERROR",
      message: `HTTP 504 Gateway Timeout while calling upstream dependency /v1/${serviceName}/checkout`,
      traceId,
      spanId: rootSpanId,
      attributes: { "http.status_code": 504 },
    },
  ]);

  // 5. Metric Points (Gauge & Sum)
  await repository.bulkInsertMetrics(org.id, [
    {
      organizationId: org.id,
      timestamp: startTime,
      serviceName,
      environment,
      metricName: "http.server.duration",
      metricType: "gauge",
      value: 2450,
    },
    {
      organizationId: org.id,
      timestamp: startTime,
      serviceName,
      environment,
      metricName: "http.server.error_rate",
      metricType: "gauge",
      value: 0.35,
    },
    {
      organizationId: org.id,
      timestamp: startTime,
      serviceName,
      environment,
      metricName: "db.client.connections.usage",
      metricType: "gauge",
      value: 50,
    },
  ]);

  console.log(`✅ Demo Telemetry seeded successfully for Organization "${org.id}"!`);
  return { organizationId: org.id, apiKey: rawKey };
}
