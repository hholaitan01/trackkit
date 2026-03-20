import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/db";
import { getWsStats } from "../ws/handler";

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
}
