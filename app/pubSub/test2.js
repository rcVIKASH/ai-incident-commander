import amqp from "amqplib";

async function main() {
  const connection = await amqp.connect("amqp://localhost");

  const channel = await connection.createChannel();

  const queue = "hello";

  await channel.assertQueue(queue, {
    durable: true,
    arguments: {
      "x-queue-type": "quorum",
    },
  });

  console.log(
    `[*] Waiting for messages in "${queue}". To exit press CTRL+C`
  );

  await channel.consume(
    queue,
    (msg) => {
      if (msg) {
        console.log(`[x] Received: ${msg.content.toString()}`);

        // Tell RabbitMQ that we successfully processed the message.
        channel.ack(msg);
      }
    },
    {
      noAck: false,
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});