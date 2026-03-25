import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/db";
import { randomBytes } from "crypto";
import { config } from "../lib/config";

export async function webhookRoutes(app: FastifyInstance) {
  // Create webhook
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const body = request.body as any;

    // Check webhook limit for plan
    const planLimit = config.planLimits[tenant.plan as keyof typeof config.planLimits];
    const webhookCount = await db.webhook.count({ where: { tenantId: tenant.id } });

    if (webhookCount >= planLimit.webhooks) {
      return reply.status(429).send({
        error: "limit_exceeded",
        message: `Webhook limit reached (${planLimit.webhooks} for ${tenant.plan} plan). Upgrade to add more.`,
      });
    }

    const webhook = await db.webhook.create({
      data: {
        tenantId: tenant.id,
        url: body.url,
        secret: randomBytes(32).toString("hex"),
        events: body.events || [
          "delivery.created",
          "delivery.status_changed",
          "delivery.driver_assigned",
        ],
      },
    });

    return reply.status(201).send(webhook);
  });

  // List webhooks
  app.get("/", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const webhooks = await db.webhook.findMany({
      where: { tenantId: tenant.id },
    });
    return { data: webhooks };
  });

  // Delete webhook
  app.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };

    await db.webhook.delete({
      where: { id, tenantId: tenant.id },
    });

    return { ok: true };
  });
}
