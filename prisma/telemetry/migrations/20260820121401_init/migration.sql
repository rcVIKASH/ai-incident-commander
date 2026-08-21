-- CreateTable
CREATE TABLE "telemetry_spans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "spanId" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "serviceName" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "operationName" TEXT NOT NULL,
    "spanKind" TEXT,
    "statusCode" TEXT NOT NULL DEFAULT 'OK',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "attributes" JSONB,
    "resourceAttributes" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_spans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "serviceName" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "traceId" TEXT,
    "spanId" TEXT,
    "attributes" JSONB,
    "resourceAttributes" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventHash" TEXT,

    CONSTRAINT "telemetry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_points" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "serviceName" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "metricName" TEXT NOT NULL,
    "metricType" TEXT NOT NULL DEFAULT 'gauge',
    "value" DOUBLE PRECISION NOT NULL,
    "attributes" JSONB,
    "resourceAttributes" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventHash" TEXT,

    CONSTRAINT "metric_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telemetry_spans_organizationId_serviceName_startTime_idx" ON "telemetry_spans"("organizationId", "serviceName", "startTime");

-- CreateIndex
CREATE INDEX "telemetry_spans_organizationId_traceId_idx" ON "telemetry_spans"("organizationId", "traceId");

-- CreateIndex
CREATE INDEX "telemetry_spans_organizationId_statusCode_startTime_idx" ON "telemetry_spans"("organizationId", "statusCode", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_spans_organizationId_traceId_spanId_key" ON "telemetry_spans"("organizationId", "traceId", "spanId");

-- CreateIndex
CREATE INDEX "telemetry_logs_organizationId_serviceName_timestamp_idx" ON "telemetry_logs"("organizationId", "serviceName", "timestamp");

-- CreateIndex
CREATE INDEX "telemetry_logs_organizationId_traceId_idx" ON "telemetry_logs"("organizationId", "traceId");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_logs_organizationId_eventHash_key" ON "telemetry_logs"("organizationId", "eventHash");

-- CreateIndex
CREATE INDEX "metric_points_organizationId_serviceName_metricName_timesta_idx" ON "metric_points"("organizationId", "serviceName", "metricName", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "metric_points_organizationId_eventHash_key" ON "metric_points"("organizationId", "eventHash");
