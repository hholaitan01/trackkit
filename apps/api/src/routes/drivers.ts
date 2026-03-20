import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/db";

export async function driverRoutes(app: FastifyInstance) {
  // Create driver
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const body = request.body as any;

    const driver = await db.driver.create({
      data: {
        tenantId: tenant.id,
        externalId: body.externalId || null,
        name: body.name,
        phone: body.phone || null,
      },
    });

    return reply.status(201).send(driver);
  });

  // List drivers
  app.get("/", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const query = request.query as any;

    const drivers = await db.driver.findMany({
      where: {
        tenantId: tenant.id,
        ...(query.online === "true" ? { isOnline: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(query.limit) || 50, 100),
    });

    return { data: drivers, count: drivers.length };
  });

  // Get driver
  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };

    const driver = await db.driver.findFirst({
      where: { id, tenantId: tenant.id },
      include: { deliveries: { where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } } },
    });

    if (!driver) return reply.status(404).send({ error: "not_found" });
    return driver;
  });

  // Update driver location (bulk - from driver app)
  app.post("/:id/location", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };
    const { lat, lng, heading, speed } = request.body as any;

    await db.driver.update({
      where: { id, tenantId: tenant.id },
      data: { lat, lng, heading, speed, locationAt: new Date(), isOnline: true },
    });

    return { ok: true };
  });

  // Toggle driver online/offline
  app.patch("/:id/status", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };
    const { isOnline } = request.body as { isOnline: boolean };

    return db.driver.update({
      where: { id, tenantId: tenant.id },
      data: { isOnline },
    });
  });
}
