import express, { type Express } from "express";
import cors from "cors";
import pinoHttpModule from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const pinoHttp = (pinoHttpModule as any).pinoHttp || pinoHttpModule;

const app: Express = express();

app.use(
  (pinoHttp as any)({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "https://menpoe-contanova.web.app", "https://menpoe-contanova.firebaseapp.com"];

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/", router);

export default app;
