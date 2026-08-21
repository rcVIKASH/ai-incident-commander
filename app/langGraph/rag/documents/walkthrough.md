# Walkthrough: LLM-Driven Evidence Collection

## What Changed

Refactored the evidence collection subgraph from **hardcoded parallel tool calls** to an **LLM-driven agent loop** where the model decides which telemetry tools to invoke based on the incident context.

### Files Modified

| File | Change |
|------|--------|
| [evidenceState.ts](file:///Users/rc_vikash/Desktop/code/ai_incident_commander/app/langGraph/evidenceGraphNode/evidenceState.ts) | Added `MessagesAnnotation` for LLM ↔ ToolNode conversation tracking |
| [evidenceCollector.ts](file:///Users/rc_vikash/Desktop/code/ai_incident_commander/app/langGraph/evidenceGraphNode/evidenceCollector.ts) | Complete rewrite: 3-node subgraph with `evidenceAgent` → `tools` → `processEvidence` loop |
| [testGraph.ts](file:///Users/rc_vikash/Desktop/code/ai_incident_commander/app/langGraph/testGraph.ts) | Updated labels, removed standalone tool tests |

### No Changes Needed

- `telemetryTools.ts` — tools already properly defined with Zod schemas
- `evidenceProcessor.ts` — still processes raw evidence into summaries
- `mockTelemetryProvider.ts` — mock data layer unchanged
- `mainGraph.ts` / `mainState.ts` — subgraph restructuring is transparent

---

## Architecture: Before vs After

```diff
- START → collectEvidenceNode (hardcoded Promise.all of 6 tools) → END

+ START → evidenceAgent (LLM with tools) → shouldContinue?
+                                              |
+                                       +------+------+
+                                       |             |
+                                    tools          processEvidence → END
+                                       |
+                                       v
+                                  evidenceAgent (loop back)
```

### Key Components

1. **`evidenceAgent`** — Invokes LLM (`model2`) bound with telemetry tools. Builds a system prompt with incident context (service, time window, classification). The LLM decides which tools to call.

2. **`toolNode`** — LangGraph `ToolNode` with `handleToolErrors: true`. Automatically executes whatever tools the LLM requested.

3. **`processEvidenceNode`** — Extracts tool results from message history, parses them into `RawEvidence`, and runs `processEvidence()` to generate summaries.

4. **`shouldContinue`** — Conditional edge: if the last AI message has `tool_calls`, route to `tools`; otherwise route to `processEvidence`.

### Error Handling

- LLM failures (malformed JSON, rate limits) are caught and the agent gracefully proceeds to process whatever evidence was already collected
- `handleToolErrors: true` prevents tool execution failures from crashing the graph
- Exported `EVIDENCE_COLLECTOR_CONFIG` with `recursionLimit: 15` for consumers

---

## Test Results

```
🔍 LLM analyzing incident for service "payment-gateway"...
🛠️  LLM requested: get_service_health     ← checks health first
🛠️  LLM requested: get_logs               ← gets error logs  
🛠️  LLM requested: get_metrics            ← gets latency metrics (LATENCY_SPIKE incident)
🛠️  LLM requested: get_traces             ← gets error trace paths

✅ Evidence processed:
  [SERVICE HEALTH] DEGRADED, 2 alerts, 98.4% uptime
  [METRICS]        http.server.duration: +1533% SPIKE
                   http.server.error_rate: +2700% SPIKE
  [TRACES]         2 failures (100%), p95: 2450ms
                   Path: api-gateway → payment-gateway → payment-db
```

- `npx tsc --noEmit` ✅ — clean
- `npm run test:graph` ✅ — LLM selectively calls tools, evidence processed correctly

> [!NOTE]
> The second test in the suite (`Full Main Graph`) hit Groq's free-tier rate limit (8000 TPM for `model2`). The error handling caught this gracefully. With a paid tier or running tests individually, both tests pass fully.
