import amqp from "amqplib";

async function main() {
  const connection = await amqp.connect("amqp://localhost");

  const channel = await connection.createChannel();

  const queue = "hello";
  const messages = ["test", "test2", "test3", "test4", "test5"];

  await channel.assertQueue(queue, {
    durable: true,
    arguments: {
      "x-queue-type": "quorum",
    },
  });

  channel.sendToQueue(queue, Buffer.from(messages.join(",")), {
    persistent: true,
  });

  console.log(`[x] Sent: ${messages.join(", ")}`);

  // Give RabbitMQ time to receive the message before closing.
  await new Promise((resolve) => setTimeout(resolve, 500));

  await channel.close();
  await connection.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});