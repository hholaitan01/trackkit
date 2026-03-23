import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomBytes } from "crypto";
import { db } from "../lib/db";
import { getWsStats } from "../ws/handler";

function generateApiKey(isLive: boolean): string {
  const prefix = isLive ? "tk_live_" : "tk_test_";
  return prefix + randomBytes(24).toString("base64url");
}

export async function tenantRoutes(app: FastifyInstance) {
  // Get current tenant info
  app.get("/me", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;

    const [activeDeliveries, totalDeliveries] = await Promise.all([
      db.delivery.count({
        where: { tenantId: tenant.id, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      }),
      db.delivery.count({ where: { tenantId: tenant.id } }),
    ]);

    const wsStats = getWsStats();

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      usage: {
        deliveriesThisMonth: tenant.deliveryCount,
        limit: tenant.deliveryLimit,
        percentUsed: Math.round((tenant.deliveryCount / tenant.deliveryLimit) * 100),
      },
      stats: {
        activeDeliveries,
        totalDeliveries,
        liveConnections: wsStats.totalConnections,
      },
    };
  });

  // Update tenant branding
  app.patch("/me", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const body = request.body as any;

    return db.tenant.update({
      where: { id: tenant.id },
      data: {
        name: body.name || undefined,
        logoUrl: body.logoUrl || undefined,
        brandColor: body.brandColor || undefined,
        domain: body.domain || undefined,
      },
    });
  });

  // List API keys
  app.get("/me/keys", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const keys = await db.apiKey.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        key: true,
        isLive: true,
        lastUsed: true,
        createdAt: true,
      },
    });
    return { data: keys };
  });

  // Create a new API key
  app.post("/me/keys", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const body = request.body as any;

    const name = body?.name?.trim() || "Untitled Key";
    const isLive = body?.isLive === true;

    const key = generateApiKey(isLive);

    const apiKey = await db.apiKey.create({
      data: {
        key,
        name,
        tenantId: tenant.id,
        isLive,
      },
    });

    return {
      id: apiKey.id,
      key,
      name: apiKey.name,
      isLive: apiKey.isLive,
      createdAt: apiKey.createdAt,
      message: "Save this key — it won't be shown again in full.",
    };
  });

  // Delete / revoke an API key
  app.delete("/me/keys/:keyId", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { keyId } = request.params as any;

    // Ensure the key belongs to this tenant
    const existing = await db.apiKey.findFirst({
      where: { id: keyId, tenantId: tenant.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: "not_found", message: "API key not found" });
    }

    // Prevent deleting the last key
    const count = await db.apiKey.count({ where: { tenantId: tenant.id } });
    if (count <= 1) {
      return reply.status(400).send({
        error: "cannot_delete",
        message: "Cannot delete your only API key. Create a new one first.",
      });
    }

    await db.apiKey.delete({ where: { id: keyId } });

    return { deleted: true, id: keyId };
  });
}
