import app from "./app";
import { logger } from "./lib/logger";
import { connectRedis } from "./config/redis";

const port = Number(process.env["PORT"] ?? 3001);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

// Connect Redis before accepting traffic (non-fatal — falls back to memory)
await connectRedis();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
