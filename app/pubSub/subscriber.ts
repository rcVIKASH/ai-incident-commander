import amqp, { Channel, ChannelModel } from "amqplib";
import { mainGraph } from "../langGraph/mainGraph.js";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const INCIDENT_QUEUE = "incident_queue";

/**
 * Starts consuming incident events from RabbitMQ queue and invokes LangGraph with thread_id set to organizationId
 */
export async function startIncidentSubscriber(): Promise<void> {
  try {
    const connection: ChannelModel = await amqp.connect(RABBITMQ_URL);
    const channel: Channel = await connection.createChannel();

    await channel.assertQueue(INCIDENT_QUEUE, {
      durable: true,
    });

    console.log(
      `[RabbitMQ Receiver] Subscribed and waiting for incident messages in queue "${INCIDENT_QUEUE}"...`
    );

    await channel.consume(
      INCIDENT_QUEUE,
      async (msg) => {
        if (!msg) return;

        try {
          const rawContent = msg.content.toString();
          const incidentPayload = JSON.parse(rawContent);

          console.log(
            `\n📥 [RabbitMQ Receiver] Incident event received for service "${incidentPayload.service}" (Org ID: ${incidentPayload.organizationId})`
          );

          // Configure thread_id to organizationId:incidentId so distinct investigations do not collide on checkpoint state
          const orgId = incidentPayload.organizationId || "default-org";
          const incidentId = incidentPayload.id || incidentPayload.externalAlertId || `inc-${Date.now()}`;
          const threadId = `${orgId}:${incidentId}`;

          const config = {
            configurable: {
              thread_id: threadId,
            },
          };

          // Extract detectedAt/startedAt/timestamp timestamp or fallback to current time
          const rawTimestamp =
            incidentPayload.detectedAt ||
            incidentPayload.startedAt ||
            incidentPayload.timestamp ||
            incidentPayload.createdAt;

          const timestampIso = rawTimestamp
            ? new Date(rawTimestamp).toISOString()
            : new Date().toISOString();

          // Format state input payload for LangGraph
          const incidentInput = {
            alertId: incidentPayload.externalAlertId || incidentPayload.id,
            incidentId,
            organizationId: orgId,
            service: incidentPayload.service,
            severity: incidentPayload.severity,
            type: incidentPayload.type,
            title: incidentPayload.title,
            message: incidentPayload.message,
            timestamp: timestampIso,
            metadata: incidentPayload.metadata,
          };

          console.log(
            `⚡ [RabbitMQ Receiver] Invoking LangGraph mainGraph for Thread ID: "${threadId}" (Timestamp: ${timestampIso})...`
          );

          const graphResult = await mainGraph.invoke(
            {
              incident: incidentInput,
            },
            config
          );

          console.log(
            `✅ [RabbitMQ Receiver] LangGraph execution completed for Org ID "${orgId}":`
          );
          console.dir(graphResult.classification, { depth: null });

          // Acknowledge message after processing
          channel.ack(msg);
        } catch (err: any) {
          console.error(
            `❌ [RabbitMQ Receiver] Error processing incident event:`,
            err?.message || err
          );
          channel.ack(msg);
        }
      },
      {
        noAck: false,
      }
    );
  } catch (error: any) {
    console.error("[RabbitMQ Receiver] Connection error:", error?.message || error);
  }
}
