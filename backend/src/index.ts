import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { pinoHttp } from "pino-http";
import type { IncomingMessage } from "http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import authRoutes from "./routes/authRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import runRoutes from "./routes/runRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import { setupSocketHandlers } from "./socket/index.js";
import { setIO } from "./socket/ioRef.js";
import { prisma } from "./config/prisma.js";

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === env.CLIENT_URL) return true;
  if (env.NODE_ENV === "development" && /^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }
  return false;
}

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req: IncomingMessage & { url?: string }) => req.url === "/health" || req.url === "/metrics" },
  })
);
app.use("/api", apiRateLimit);

app.get("/health", async (_req, res) => {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }
  res.json({
    status: db === "ok" ? "ok" : "degraded",
    uptime: process.uptime(),
    db,
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptimeSec: Math.round(process.uptime()),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    },
    sockets: io.engine.clientsCount,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/run", runRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/social", socialRoutes);

app.use(errorHandler);

setIO(io);
setupSocketHandlers(io);

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Server running");
});
