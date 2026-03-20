/**
 * TrackKit SDK
 *
 * Usage:
 *   import TrackKit from '@trackkit/sdk'
 *   const tk = new TrackKit({ apiKey: 'tk_live_xxx' })
 *   const delivery = await tk.deliveries.create({ ... })
 */

interface TrackKitOptions {
  apiKey: string;
  baseUrl?: string;
  wsUrl?: string;
}

interface CreateDeliveryInput {
  pickup: { address?: string; lat?: number; lng?: number };
  dropoff: { address?: string; lat?: number; lng?: number };
  driverId?: string;
  externalId?: string;
  metadata?: Record<string, any>;
}

interface UpdateLocationInput {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

interface CreateDriverInput {
  name: string;
  phone?: string;
  externalId?: string;
}

interface CreateWebhookInput {
  url: string;
  events?: string[];
}

interface ListOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

type DeliveryStatus =
  | "CONFIRMED"
  | "DRIVER_ASSIGNED"
  | "PICKUP_EN_ROUTE"
  | "PICKED_UP"
  | "DELIVERING"
  | "ARRIVING"
  | "DELIVERED"
  | "CANCELLED";

class TrackKitError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "TrackKitError";
    this.status = status;
    this.code = code;
  }
}

class HTTPClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  async request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new TrackKitError(
        data?.message || `Request failed with status ${res.status}`,
        res.status,
        data?.error || "unknown_error"
      );
    }

    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request("GET", path);
  }

  post<T>(path: string, body?: any): Promise<T> {
    return this.request("POST", path, body);
  }

  patch<T>(path: string, body?: any): Promise<T> {
    return this.request("PATCH", path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request("DELETE", path);
  }
}

// ─── Deliveries Resource ───
class DeliveriesResource {
  private http: HTTPClient;

  constructor(http: HTTPClient) {
    this.http = http;
  }

  /**
   * Create a new delivery.
   * Geocodes addresses automatically if only address strings are provided.
   *
   * @example
   * const delivery = await tk.deliveries.create({
   *   pickup: { address: "Yaba Tech, Lagos" },
   *   dropoff: { address: "Victoria Island, Lagos" },
   *   metadata: { orderId: "ORD-123" }
   * })
   * console.log(delivery.trackingUrl) // https://yourapp.trackkit.dev/track/TK-ABC123
   */
  create(input: CreateDeliveryInput) {
    return this.http.post<{
      id: string;
      trackingCode: string;
      trackingUrl: string;
      status: string;
      eta: { minutes: number; distanceKm: number } | null;
      pickup: { address: string; lat: number; lng: number };
      dropoff: { address: string; lat: number; lng: number };
      createdAt: string;
    }>("/v1/deliveries", input);
  }

  /**
   * Get a delivery by ID.
   */
  get(id: string) {
    return this.http.get<any>(`/v1/deliveries/${id}`);
  }

  /**
   * List deliveries with optional filters.
   */
  list(options?: ListOptions) {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.status) params.set("status", options.status);

    const qs = params.toString();
    return this.http.get<{ data: any[]; count: number }>(
      `/v1/deliveries${qs ? `?${qs}` : ""}`
    );
  }

  /**
   * Update delivery status.
   *
   * @example
   * await tk.deliveries.updateStatus("del_123", "PICKED_UP")
   */
  updateStatus(id: string, status: DeliveryStatus) {
    return this.http.patch<any>(`/v1/deliveries/${id}/status`, { status });
  }

  /**
   * Update driver location for a delivery.
   * Call this from your driver app every 5-10 seconds.
   *
   * @example
   * await tk.deliveries.updateLocation("del_123", {
   *   lat: 6.4738, lng: 3.3952, speed: 35
   * })
   */
  updateLocation(id: string, location: UpdateLocationInput) {
    return this.http.post<{ ok: boolean; eta: { distanceKm: number; etaMinutes: number } }>(
      `/v1/deliveries/${id}/location`,
      location
    );
  }

  /**
   * Assign a driver to a delivery.
   */
  assign(deliveryId: string, driverId: string) {
    return this.http.post<any>(`/v1/deliveries/${deliveryId}/assign`, { driverId });
  }
}

// ─── Drivers Resource ───
class DriversResource {
  private http: HTTPClient;

  constructor(http: HTTPClient) {
    this.http = http;
  }

  create(input: CreateDriverInput) {
    return this.http.post<any>("/v1/drivers", input);
  }

  get(id: string) {
    return this.http.get<any>(`/v1/drivers/${id}`);
  }

  list(options?: { limit?: number; online?: boolean }) {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.online !== undefined) params.set("online", String(options.online));

    const qs = params.toString();
    return this.http.get<{ data: any[]; count: number }>(
      `/v1/drivers${qs ? `?${qs}` : ""}`
    );
  }

  updateLocation(id: string, location: UpdateLocationInput) {
    return this.http.post<{ ok: boolean }>(`/v1/drivers/${id}/location`, location);
  }

  setOnline(id: string, isOnline: boolean) {
    return this.http.patch<any>(`/v1/drivers/${id}/status`, { isOnline });
  }
}

// ─── Webhooks Resource ───
class WebhooksResource {
  private http: HTTPClient;

  constructor(http: HTTPClient) {
    this.http = http;
  }

  create(input: CreateWebhookInput) {
    return this.http.post<any>("/v1/webhooks", input);
  }

  list() {
    return this.http.get<{ data: any[] }>("/v1/webhooks");
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`/v1/webhooks/${id}`);
  }
}

// ─── Tenant (account) Resource ───
class TenantResource {
  private http: HTTPClient;

  constructor(http: HTTPClient) {
    this.http = http;
  }

  /**
   * Get current account info, usage stats, and plan details.
   */
  me() {
    return this.http.get<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      usage: { deliveriesThisMonth: number; limit: number; percentUsed: number };
      stats: { activeDeliveries: number; totalDeliveries: number; liveConnections: number };
    }>("/v1/tenants/me");
  }

  /**
   * Update branding (name, logo, color, custom domain).
   */
  updateBranding(data: {
    name?: string;
    logoUrl?: string;
    brandColor?: string;
    domain?: string;
  }) {
    return this.http.patch<any>("/v1/tenants/me", data);
  }

  /**
   * List API keys.
   */
  listKeys() {
    return this.http.get<{ data: any[] }>("/v1/tenants/me/keys");
  }
}

// ─── Real-time subscription (WebSocket client) ───
class RealtimeClient {
  private wsUrl: string;
  private connections = new Map<string, WebSocket>();

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl.replace(/\/$/, "");
  }

  /**
   * Subscribe to real-time updates for a delivery.
   *
   * @example
   * const unsub = tk.realtime.subscribe("TK-ABC123", {
   *   onLocation: (data) => console.log("Driver at:", data.lat, data.lng),
   *   onStatus: (data) => console.log("Status:", data.status),
   *   onDelivered: () => console.log("Delivered!"),
   * })
   *
   * // Later: unsub()
   */
  subscribe(
    trackingCode: string,
    handlers: {
      onLocation?: (data: {
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
        eta?: number;
        distance?: number;
      }) => void;
      onStatus?: (data: { status: string; eta?: number }) => void;
      onDelivered?: () => void;
      onConnect?: () => void;
      onDisconnect?: () => void;
      onError?: (err: Error) => void;
    }
  ): () => void {
    const url = `${this.wsUrl}/track/${trackingCode}`;
    let ws: WebSocket;
    let destroyed = false;
    let reconnectTimer: any;

    const connect = () => {
      if (destroyed) return;

      ws = new WebSocket(url);

      ws.onopen = () => {
        this.connections.set(trackingCode, ws);
        handlers.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "location") {
            handlers.onLocation?.(msg.data);
          }
          if (msg.type === "status") {
            handlers.onStatus?.(msg.data);
            if (msg.data.status === "DELIVERED") {
              handlers.onDelivered?.();
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        this.connections.delete(trackingCode);
        handlers.onDisconnect?.();
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        handlers.onError?.(new Error("WebSocket connection error"));
        ws.close();
      };
    };

    connect();

    // Ping keep-alive
    const pingInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    // Return unsubscribe function
    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      ws?.close();
      this.connections.delete(trackingCode);
    };
  }

  /**
   * Disconnect all subscriptions.
   */
  disconnectAll() {
    for (const [code, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();
  }
}

// ─── Main Client ───
class TrackKit {
  readonly deliveries: DeliveriesResource;
  readonly drivers: DriversResource;
  readonly webhooks: WebhooksResource;
  readonly tenant: TenantResource;
  readonly realtime: RealtimeClient;

  constructor(options: TrackKitOptions) {
    if (!options.apiKey) {
      throw new Error("TrackKit: apiKey is required");
    }

    const baseUrl = options.baseUrl || "https://api.trackkit.dev";
    const wsUrl = options.wsUrl || "wss://api.trackkit.dev/ws";

    const http = new HTTPClient(baseUrl, options.apiKey);

    this.deliveries = new DeliveriesResource(http);
    this.drivers = new DriversResource(http);
    this.webhooks = new WebhooksResource(http);
    this.tenant = new TenantResource(http);
    this.realtime = new RealtimeClient(wsUrl);
  }
}

export default TrackKit;
export { TrackKit, TrackKitError };
export type {
  TrackKitOptions,
  CreateDeliveryInput,
  UpdateLocationInput,
  CreateDriverInput,
  CreateWebhookInput,
  DeliveryStatus,
};
