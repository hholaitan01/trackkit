import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/db";

// Routes that don't require auth
const PUBLIC_PATHS = ["/health", "/track", "/ws"];

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Skip auth for public routes
  if (PUBLIC_PATHS.some((p) => request.url.startsWith(p))) return;

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "unauthorized",
      message: "Missing API key. Pass it as: Authorization: Bearer tk_live_xxx",
    });
  }

  const apiKey = authHeader.slice(7);

  const keyRecord = await db.apiKey.findUnique({
    where: { key: apiKey },
    include: { tenant: true },
  });

  if (!keyRecord) {
    return reply.status(401).send({
      error: "unauthorized",
      message: "Invalid API key.",
    });
  }

  // Attach tenant to request for downstream use
  (request as any).tenant = keyRecord.tenant;
  (request as any).apiKey = keyRecord;

  // Update last used (fire-and-forget)
  db.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});
}
