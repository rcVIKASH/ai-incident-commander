import amqp, { Channel, ChannelModel } from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const INCIDENT_QUEUE = "incident_queue";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

/**
 * Ensures RabbitMQ connection and channel are open and returns the channel
 */
async function getChannel(): Promise<Channel> {
  if (!connection) {
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on("error", (err: Error) => {
      console.error("[RabbitMQ Publisher] Connection error:", err);
      connection = null;
      channel = null;
    });
    connection.on("close", () => {
      console.log("[RabbitMQ Publisher] Connection closed");
      connection = null;
      channel = null;
    });
  }

  if (!channel) {
    channel = await connection.createChannel();
    await channel.assertQueue(INCIDENT_QUEUE, {
      durable: true,
    });
  }

  return channel;
}

/**
 * Publishes an incident creation event to RabbitMQ queue
 */
export async function publishIncident(incident: any): Promise<void> {
  try {
    const ch = await getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(incident));

    ch.sendToQueue(INCIDENT_QUEUE, messageBuffer, {
      persistent: true,
    });

    console.log(
      `[RabbitMQ Publisher] Incident "${incident.title || incident.id}" published to queue "${INCIDENT_QUEUE}" (Org ID: ${incident.organizationId})`
    );
  } catch (error) {
    console.error("[RabbitMQ Publisher] Error publishing incident event:", error);
    // Reset connection and channel state on error to reconnect on next publish attempt
    channel = null;
    connection = null;
  }
}
