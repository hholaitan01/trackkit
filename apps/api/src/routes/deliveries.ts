import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../lib/db";
import { geocode, getRoute, estimateETA } from "../services/routing";
import { broadcastLocationUpdate, broadcastStatusUpdate } from "../ws/handler";
import { fireWebhook } from "../services/webhooks";
import { nanoid } from "nanoid";

function generateTrackingCode(): string {
  return `TK-${nanoid(6).toUpperCase()}`;
}

export async function deliveryRoutes(app: FastifyInstance) {
  // ─── Create Delivery ───
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const body = request.body as any;

    // Check plan limits
    if (tenant.deliveryCount >= tenant.deliveryLimit) {
      return reply.status(429).send({
        error: "limit_exceeded",
        message: `Monthly delivery limit reached (${tenant.deliveryLimit}). Upgrade your plan.`,
      });
    }

    // Geocode addresses if coordinates not provided
    let pickupLat = body.pickup?.lat;
    let pickupLng = body.pickup?.lng;
    let pickupAddress = body.pickup?.address || "";

    if (!pickupLat && pickupAddress) {
      const geo = await geocode(pickupAddress);
      if (!geo) {
        return reply.status(400).send({ error: "geocode_failed", message: "Could not geocode pickup address." });
      }
      pickupLat = geo.lat;
      pickupLng = geo.lng;
      pickupAddress = geo.displayName;
    }

    let dropoffLat = body.dropoff?.lat;
    let dropoffLng = body.dropoff?.lng;
    let dropoffAddress = body.dropoff?.address || "";

    if (!dropoffLat && dropoffAddress) {
      const geo = await geocode(dropoffAddress);
      if (!geo) {
        return reply.status(400).send({ error: "geocode_failed", message: "Could not geocode dropoff address." });
      }
      dropoffLat = geo.lat;
      dropoffLng = geo.lng;
      dropoffAddress = geo.displayName;
    }

    // Get initial route
    const route = await getRoute(
      { lat: pickupLat, lng: pickupLng },
      { lat: dropoffLat, lng: dropoffLng }
    );

    const trackingCode = generateTrackingCode();

    const delivery = await db.delivery.create({
      data: {
        trackingCode,
        externalId: body.externalId || null,
        tenantId: tenant.id,
        driverId: body.driverId || null,
        status: body.driverId ? "DRIVER_ASSIGNED" : "PENDING",
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        currentEtaMinutes: route?.durationMinutes || null,
        currentDistanceKm: route?.distanceKm || null,
        routePolyline: route?.polyline || null,
        metadata: body.metadata || null,
        confirmedAt: new Date(),
      },
    });

    // Increment delivery count
    await db.tenant.update({
      where: { id: tenant.id },
      data: { deliveryCount: { increment: 1 } },
    });

    // Fire webhook
    fireWebhook(tenant.id, "delivery.created", {
      id: delivery.id,
      trackingCode: delivery.trackingCode,
      status: delivery.status,
      trackingUrl: `${getTrackingBaseUrl(tenant)}/${delivery.trackingCode}`,
    });

    return reply.status(201).send({
      id: delivery.id,
      trackingCode: delivery.trackingCode,
      trackingUrl: `${getTrackingBaseUrl(tenant)}/${delivery.trackingCode}`,
      status: delivery.status,
      eta: route
        ? { minutes: route.durationMinutes, distanceKm: route.distanceKm }
        : null,
      pickup: { address: pickupAddress, lat: pickupLat, lng: pickupLng },
      dropoff: { address: dropoffAddress, lat: dropoffLat, lng: dropoffLng },
      createdAt: delivery.createdAt,
    });
  });

  // ─── Get Delivery ───
  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };

    const delivery = await db.delivery.findFirst({
      where: { id, tenantId: tenant.id },
      include: { driver: { select: { id: true, name: true, lat: true, lng: true } } },
    });

    if (!delivery) {
      return reply.status(404).send({ error: "not_found" });
    }

    return delivery;
  });

  // ─── List Deliveries ───
  app.get("/", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const query = request.query as any;

    const deliveries = await db.delivery.findMany({
      where: {
        tenantId: tenant.id,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(query.limit) || 50, 100),
      skip: parseInt(query.offset) || 0,
      include: { driver: { select: { id: true, name: true } } },
    });

    return { data: deliveries, count: deliveries.length };
  });

  // ─── Update Delivery Status ───
  app.patch("/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const validStatuses = [
      "CONFIRMED", "DRIVER_ASSIGNED", "PICKUP_EN_ROUTE",
      "PICKED_UP", "DELIVERING", "ARRIVING", "DELIVERED", "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return reply.status(400).send({
        error: "invalid_status",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const timestamps: Record<string, any> = {};
    if (status === "PICKED_UP") timestamps.pickedUpAt = new Date();
    if (status === "DELIVERED") timestamps.deliveredAt = new Date();
    if (status === "CANCELLED") timestamps.cancelledAt = new Date();

    const delivery = await db.delivery.update({
      where: { id, tenantId: tenant.id },
      data: { status: status as any, ...timestamps },
    });

    // Broadcast to WebSocket subscribers
    broadcastStatusUpdate(delivery.trackingCode, {
      status: delivery.status,
      eta: delivery.currentEtaMinutes,
    });

    // Fire webhook
    fireWebhook(tenant.id, "delivery.status_changed", {
      id: delivery.id,
      trackingCode: delivery.trackingCode,
      status: delivery.status,
      previousStatus: status, // TODO: track previous
    });

    return delivery;
  });

  // ─── Update Driver Location (called from driver app) ───
  app.post("/:id/location", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };
    const { lat, lng, heading, speed } = request.body as {
      lat: number; lng: number; heading?: number; speed?: number;
    };

    if (!lat || !lng) {
      return reply.status(400).send({ error: "missing_coordinates" });
    }

    const delivery = await db.delivery.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!delivery) {
      return reply.status(404).send({ error: "not_found" });
    }

    // Calculate new ETA from current position to dropoff
    const eta = estimateETA(
      { lat, lng },
      { lat: delivery.dropoffLat, lng: delivery.dropoffLng }
    );

    // Append to location history (keep last 100 points)
    const history = (delivery.locationHistory as any[]) || [];
    history.push({ lat, lng, heading, speed, ts: Date.now() });
    if (history.length > 100) history.splice(0, history.length - 100);

    // Auto-detect status transitions
    let newStatus = delivery.status;
    if (eta.distanceKm < 0.2 && delivery.status === "DELIVERING") {
      newStatus = "ARRIVING";
    }

    await db.delivery.update({
      where: { id },
      data: {
        currentEtaMinutes: eta.etaMinutes,
        currentDistanceKm: eta.distanceKm,
        locationHistory: history,
        status: newStatus as any,
      },
    });

    // Update driver record too
    if (delivery.driverId) {
      await db.driver.update({
        where: { id: delivery.driverId },
        data: { lat, lng, heading, speed, locationAt: new Date() },
      });
    }

    // Broadcast real-time location to all tracking widget subscribers
    broadcastLocationUpdate(delivery.trackingCode, {
      lat,
      lng,
      heading,
      speed,
      eta: eta.etaMinutes,
      distance: eta.distanceKm,
      status: newStatus,
    });

    return { ok: true, eta };
  });

  // ─── Assign Driver ───
  app.post("/:id/assign", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant;
    const { id } = request.params as { id: string };
    const { driverId } = request.body as { driverId: string };

    const delivery = await db.delivery.update({
      where: { id, tenantId: tenant.id },
      data: {
        driverId,
        status: "DRIVER_ASSIGNED",
      },
      include: { driver: { select: { id: true, name: true, phone: true } } },
    });

    broadcastStatusUpdate(delivery.trackingCode, {
      status: "DRIVER_ASSIGNED",
      driver: delivery.driver ? { name: delivery.driver.name } : null,
    });

    fireWebhook(tenant.id, "delivery.driver_assigned", {
      id: delivery.id,
      trackingCode: delivery.trackingCode,
      driverId,
    });

    return delivery;
  });
}

function getTrackingBaseUrl(tenant: any): string {
  if (tenant.domain) return `https://${tenant.domain}/track`;
  return `https://${tenant.slug}.trackkit.dev/track`;
}
