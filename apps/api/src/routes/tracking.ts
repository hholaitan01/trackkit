import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/db";

export async function trackingRoutes(app: FastifyInstance) {
  // ─── Get delivery by tracking code (public) ───
  // GET /track/TK-ABC123
  app.get("/:trackingCode", async (request: FastifyRequest, reply: FastifyReply) => {
    const { trackingCode } = request.params as { trackingCode: string };

    const delivery = await db.delivery.findUnique({
      where: { trackingCode },
      include: {
        tenant: {
          select: { name: true, slug: true, logoUrl: true, brandColor: true },
        },
        driver: {
          select: { name: true, lat: true, lng: true, heading: true },
        },
      },
    });

    if (!delivery) {
      return reply.status(404).send({ error: "not_found", message: "Delivery not found." });
    }

    // Return only what the tracking widget needs (no sensitive data)
    return {
      trackingCode: delivery.trackingCode,
      status: delivery.status,
      pickup: {
        address: delivery.pickupAddress,
        lat: delivery.pickupLat,
        lng: delivery.pickupLng,
      },
      dropoff: {
        address: delivery.dropoffAddress,
        lat: delivery.dropoffLat,
        lng: delivery.dropoffLng,
      },
      driver: delivery.driver
        ? {
            name: delivery.driver.name,
            lat: delivery.driver.lat,
            lng: delivery.driver.lng,
            heading: delivery.driver.heading,
          }
        : null,
      eta: delivery.currentEtaMinutes,
      distance: delivery.currentDistanceKm,
      routePolyline: delivery.routePolyline,
      brand: {
        name: delivery.tenant.name,
        logo: delivery.tenant.logoUrl,
        color: delivery.tenant.brandColor,
      },
      timestamps: {
        created: delivery.createdAt,
        confirmed: delivery.confirmedAt,
        pickedUp: delivery.pickedUpAt,
        delivered: delivery.deliveredAt,
      },
    };
  });
}
