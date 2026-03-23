import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import { deliveryRoutes } from "./routes/deliveries";
import { driverRoutes } from "./routes/drivers";
import { tenantRoutes } from "./routes/tenants";
import { trackingRoutes } from "./routes/tracking";
import { webhookRoutes } from "./routes/webhooks";
import { authRoutes } from "./routes/auth";
import { wsHandler } from "./ws/handler";
import { authMiddleware } from "./middleware/auth";
import { config } from "./lib/config";

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport: config.nodeEnv === "development" ? { target: "pino-pretty" } : undefined,
  },
});

async function bootstrap() {
  // ─── Plugins ───
  await app.register(fastifyCors, {
    origin: true, // Allow all for now; lock down per-tenant in production
    credentials: true,
  });

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(fastifyWebsocket);

  // ─── Auth hook for API routes ───
  app.addHook("onRequest", authMiddleware);

  // ─── API Routes ───
  app.register(deliveryRoutes, { prefix: "/v1/deliveries" });
  app.register(driverRoutes, { prefix: "/v1/drivers" });
  app.register(tenantRoutes, { prefix: "/v1/tenants" });
  app.register(webhookRoutes, { prefix: "/v1/webhooks" });

  // ─── Public routes (no auth) ───
  app.register(authRoutes, { prefix: "/v1/auth" });
  app.register(trackingRoutes, { prefix: "/track" });

  // ─── WebSocket for real-time location streaming ───
  app.register(wsHandler, { prefix: "/ws" });

  // ─── Health check ───
  app.get("/health", async () => ({ status: "ok", version: "0.1.0" }));

  // ─── Start ───
  const address = await app.listen({
    port: config.port,
    host: "0.0.0.0",
  });
  app.log.info(`TrackKit API running at ${address}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export { app };
