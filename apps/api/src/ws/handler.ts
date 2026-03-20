import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";

// ─── In-memory subscriber map ───
// Key: trackingCode, Value: Set of WebSocket connections
const subscribers = new Map<string, Set<WebSocket>>();

export async function wsHandler(app: FastifyInstance) {
  // Customer connects to track a delivery
  // ws://api.trackkit.dev/ws/track/TK-ABC123
  app.get("/track/:trackingCode", { websocket: true }, (socket, request) => {
    const { trackingCode } = request.params as { trackingCode: string };

    // Add to subscribers
    if (!subscribers.has(trackingCode)) {
      subscribers.set(trackingCode, new Set());
    }
    subscribers.get(trackingCode)!.add(socket);

    app.log.info(`WS subscriber joined: ${trackingCode} (${subscribers.get(trackingCode)!.size} total)`);

    // Send initial ack
    socket.send(JSON.stringify({
      type: "connected",
      trackingCode,
      message: "Subscribed to delivery updates",
    }));

    // Handle client messages (ping/pong, etc.)
    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    // Cleanup on disconnect
    socket.on("close", () => {
      const subs = subscribers.get(trackingCode);
      if (subs) {
        subs.delete(socket);
        if (subs.size === 0) {
          subscribers.delete(trackingCode);
        }
      }
      app.log.info(`WS subscriber left: ${trackingCode}`);
    });
  });

  // Driver sends location updates via WebSocket (alternative to REST)
  // ws://api.trackkit.dev/ws/driver?key=tk_live_xxx
  app.get("/driver", { websocket: true }, (socket, request) => {
    const query = request.query as { key?: string };

    // TODO: Validate API key from query param
    // For now, accept all connections

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "location" && msg.trackingCode) {
          // Broadcast to all subscribers of this delivery
          broadcastLocationUpdate(msg.trackingCode, {
            lat: msg.lat,
            lng: msg.lng,
            heading: msg.heading,
            speed: msg.speed,
            eta: msg.eta,
            distance: msg.distance,
            status: msg.status,
          });
        }
      } catch {
        // Ignore
      }
    });
  });
}

// ─── Broadcast functions (used by REST routes and WS handler) ───

export function broadcastLocationUpdate(
  trackingCode: string,
  data: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    eta?: number;
    distance?: number;
    status?: string;
  }
) {
  const subs = subscribers.get(trackingCode);
  if (!subs || subs.size === 0) return;

  const payload = JSON.stringify({
    type: "location",
    trackingCode,
    data,
    timestamp: Date.now(),
  });

  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function broadcastStatusUpdate(
  trackingCode: string,
  data: { status: string; eta?: number | null; driver?: any }
) {
  const subs = subscribers.get(trackingCode);
  if (!subs || subs.size === 0) return;

  const payload = JSON.stringify({
    type: "status",
    trackingCode,
    data,
    timestamp: Date.now(),
  });

  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// ─── Stats (for admin dashboard) ───
export function getWsStats() {
  let totalConnections = 0;
  for (const subs of subscribers.values()) {
    totalConnections += subs.size;
  }
  return {
    activeDeliveries: subscribers.size,
    totalConnections,
  };
}
