import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"] || 8080);

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

export default app;
