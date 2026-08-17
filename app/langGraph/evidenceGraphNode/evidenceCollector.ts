import { START, END, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
  ToolMessage
} from "@langchain/core/messages";
import { EvidenceState, EvidenceStateType } from "./evidenceState.js";
import { processEvidence } from "./evidenceProcessor.js";
import { RawEvidence } from "../../types/evidence.js";
import { getTelemetryTools } from "../tools/telemetryTools.js";
import { PostgresTelemetryProvider } from "./providers/postgresTelemetryProvider.js";
import { model4 } from "../llm.js";

// --------------------------------------------------
// Node 1: Evidence Agent — LLM decides which tools to call
// --------------------------------------------------
const evidenceAgent = async (
  state: EvidenceStateType,
): Promise<Partial<EvidenceStateType>> => {
  const incident = state.incident;

  if (!incident || !incident.service) {
    return {
      error: "Cannot collect evidence: Missing incident service in state",
    };
  }

  const orgId = incident.organizationId || "default-org";
  const provider = new PostgresTelemetryProvider(orgId);
  const telemetryTools = getTelemetryTools(provider);
  const modelWithTools = model4.bindTools(telemetryTools);

  const messages = state.messages || [];

  // Build context for the LLM on first invocation (no messages yet from the agent)
  if (messages.length === 0 || !messages[0] || !(messages[0] instanceof SystemMessage)) {
    const service = incident.service;
    const environment = incident.metadata?.environment || "production";
    const incidentTime = incident.timestamp
      ? new Date(incident.timestamp)
      : new Date();
    const startTime = new Date(
      incidentTime.getTime() - 15 * 60 * 1000,
    ).toISOString();
    const endTime = new Date(
      incidentTime.getTime() + 5 * 60 * 1000,
    ).toISOString();

    const classification = state.classification;

    const systemPrompt = `You are an AI Evidence Collection Agent for AI Incident Commander.

Your job is to collect targeted telemetry evidence for an incident using the available tools.
You are querying the PostgreSQL telemetry store for organization "${orgId}".

INCIDENT CONTEXT:
- Service: ${service}
- Environment: ${environment}
- Incident Detection Timestamp (detectedAt): ${incidentTime.toISOString()}
- Telemetry Time Window: ${startTime} to ${endTime}
- Alert: ${incident.title || incident.message}
- Severity: ${incident.severity || "UNKNOWN"}
${classification ? `- Classified Type: ${classification.incidentType}` : ""}
${classification ? `- Likely Category: ${classification.likelyCategory}` : ""}
${classification ? `- Classification Summary: ${classification.summary}` : ""}

INSTRUCTIONS:
1. Based on the incident type and alert details, decide which telemetry tools to call.
2. Focus on fetching ONLY the data relevant to this specific incident type.
3. Use targeted filters — specific severities, keywords, metric names, trace status — don't fetch everything blindly.
4. For logs, filter by severity ERROR and WARN. Use keyword filters if the alert mentions specific errors.
5. For metrics, request only the metric names relevant to the incident type.
6. For traces, filter by ERROR status to find failure paths.
7. Call get_service_health to check current service status.
8. If the incident might be deployment-related, call get_deployments and get_recent_commits.
9. When you have collected sufficient evidence, stop calling tools and provide a brief summary of what you collected.

IMPORTANT:
- Always use service="${service}" in your tool calls.
- Use startTime="${startTime}" and endTime="${endTime}" for time-bounded queries.
- Do NOT call all tools blindly. Be selective based on the incident context.`;

    console.log(
      `🔍 [EvidenceAgent] LLM analyzing incident for service "${service}" (Org: "${orgId}") to decide telemetry queries...`,
    );

    try {
      const systemMessage = new SystemMessage(systemPrompt);
      const userMessage = new HumanMessage(
        `Collect the relevant telemetry evidence for this incident:\n${JSON.stringify(incident, null, 2)}`,
      );

      const response = await modelWithTools.invoke([systemMessage, userMessage]);

      return {
        messages: [systemMessage, userMessage, response],
      };
    } catch (err: any) {
      console.error(
        `⚠️ [EvidenceAgent] LLM error on initial call, proceeding with empty evidence:`,
        err?.message?.slice(0, 200) || err,
      );
      return {
        error: `LLM failed during evidence planning: ${err?.message?.slice(0, 150) || err}`,
      };
    }
  }

  // Subsequent invocations: LLM sees previous messages + tool results
  console.log(
    `🔄 [EvidenceAgent] LLM reviewing tool results and deciding next action...`,
  );
  try {
    const response = await modelWithTools.invoke(messages);

    return {
      messages: [response],
    };
  } catch (err: any) {
    console.warn(
      `⚠️ [EvidenceAgent] LLM error during tool loop, proceeding to process collected evidence:`,
      err?.message?.slice(0, 200) || err,
    );
    return {
      messages: [
        new AIMessage(
          "Evidence collection interrupted — processing collected data.",
        ),
      ],
    };
  }
};

// --------------------------------------------------
// Node 2: Dynamic Tool Execution Node (Bound to Organization's PostgresTelemetryProvider)
// --------------------------------------------------
const executeToolsNode = async (
  state: EvidenceStateType,
): Promise<Partial<EvidenceStateType>> => {
  const orgId = state.incident?.organizationId || "default-org";
  const provider = new PostgresTelemetryProvider(orgId);
  const tools = getTelemetryTools(provider);
  const toolNode = new ToolNode(tools, { handleToolErrors: true });
  return toolNode.invoke(state);
};

// --------------------------------------------------
// Node 3: Process Evidence — extracts raw evidence from tool messages and calculates summary
// --------------------------------------------------
const processEvidenceNode = async (
  state: EvidenceStateType,
): Promise<Partial<EvidenceStateType>> => {
  try {
    // Extract tool results from message history
    const toolMessages = (state.messages || []).filter(
      (msg) => msg instanceof ToolMessage,
    );

    const rawEvidence: RawEvidence = {
      logs: [],
      metrics: [],
      traces: [],
    };

    for (const toolMsg of toolMessages) {
      try {
        const parsed = JSON.parse(
          typeof toolMsg.content === "string"
            ? toolMsg.content
            : JSON.stringify(toolMsg.content),
        );

        if (parsed.error) continue;

        if (parsed.logs) {
          rawEvidence.logs.push(...parsed.logs);
        }
        if (parsed.metrics) {
          rawEvidence.metrics.push(...parsed.metrics);
        }
        if (parsed.traces) {
          rawEvidence.traces.push(...parsed.traces);
        }
        if (parsed.status && parsed.service && parsed.uptimePercent !== undefined) {
          rawEvidence.health = parsed;
        }
        if (parsed.deployments) {
          rawEvidence.deployments = parsed.deployments;
        }
        if (parsed.commits) {
          rawEvidence.commits = parsed.commits;
        }
      } catch {
        // Skip unparseable tool messages
      }
    }

    const processedEvidence = processEvidence(rawEvidence);

    console.log(
      `✅ [EvidenceAgent] Telemetry evidence processed: ${processedEvidence.logs.totalErrors} errors, ${processedEvidence.metrics.length} metrics, ${processedEvidence.traces.failed} trace failures.`,
    );

    return {
      rawEvidence,
      processedEvidence,
    };
  } catch (err: any) {
    console.error(
      `❌ [EvidenceAgent] Error processing evidence:`,
      err?.message || err,
    );
    return {
      error: err?.message || "Failed to process collected evidence",
    };
  }
};

// --------------------------------------------------
// Conditional Edge: should the agent continue calling tools?
// --------------------------------------------------
const shouldContinue = (state: EvidenceStateType): string => {
  const messages = state.messages || [];
  const lastMessage = messages[messages.length - 1];

  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    console.log(
      `🛠️  [EvidenceAgent] LLM requested ${lastMessage.tool_calls.length} tool call(s): ${lastMessage.tool_calls.map((tc) => tc.name).join(", ")}`,
    );
    return "tools";
  }

  return "processEvidence";
};

// --------------------------------------------------
// Evidence Collection Subgraph (Postgres / OTLP driven)
// --------------------------------------------------
const graph = new StateGraph(EvidenceState)
  .addNode("evidenceAgent", evidenceAgent)
  .addNode("tools", executeToolsNode)
  .addNode("processEvidence", processEvidenceNode)
  .addEdge(START, "evidenceAgent")
  .addConditionalEdges("evidenceAgent", shouldContinue, {
    tools: "tools",
    processEvidence: "processEvidence",
  })
  .addEdge("tools", "evidenceAgent")
  .addEdge("processEvidence", END);

export const evidenceCollector = graph.compile();

/** Recommended config when invoking the evidence collector to limit agent loops */
export const EVIDENCE_COLLECTOR_CONFIG = { recursionLimit: 15 };
