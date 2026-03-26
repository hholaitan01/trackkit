// ─── @trackkit/driver-sdk ───
// React Native SDK for driver apps: GPS tracking, location streaming, delivery management.

// ─── Types ───

export interface DriverSDKConfig {
  /** TrackKit API key (tk_live_xxx or tk_test_xxx) */
  apiKey: string;
  /** API base URL (default: https://trackkitapi-production.up.railway.app) */
  apiUrl?: string;
  /** WebSocket base URL (default: derived from apiUrl) */
  wsUrl?: string;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

export interface Delivery {
  id: string;
  trackingCode: string;
  trackingUrl: string;
  status: DeliveryStatus;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  currentEtaMinutes: number | null;
  currentDistanceKm: number | null;
  driverId: string | null;
  createdAt: string;
}

export interface ETAResult {
  etaMinutes: number;
  distanceKm: number;
}

export type DeliveryStatus =
  | "PENDING"
  | "CONFIRMED"
  | "DRIVER_ASSIGNED"
  | "PICKUP_EN_ROUTE"
  | "PICKED_UP"
  | "DELIVERING"
  | "ARRIVING"
  | "DELIVERED"
  | "CANCELLED";

export interface GPSTrackingOptions {
  /** Interval in ms between location pings (default: 5000) */
  interval?: number;
  /** Minimum distance in meters to trigger an update (default: 10) */
  distanceFilter?: number;
  /** Enable high accuracy GPS (default: true) */
  highAccuracy?: boolean;
  /** Called on each successful location send */
  onUpdate?: (location: LocationUpdate, eta: ETAResult) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// ─── Driver SDK Client ───

export class TrackKitDriver {
  private apiKey: string;
  private apiUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private watchId: number | null = null;
  private lastLat: number | null = null;
  private lastLng: number | null = null;

  constructor(config: DriverSDKConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = (config.apiUrl || "https://trackkitapi-production.up.railway.app").replace(
      /\/$/,
      ""
    );
    this.wsUrl =
      config.wsUrl || this.apiUrl.replace(/^http/, "ws") + "/ws/driver?key=" + this.apiKey;
  }

  // ─── HTTP helpers ───

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }
    return data as T;
  }

  // ─── Deliveries ───

  /** List deliveries assigned to this tenant */
  async listDeliveries(status?: DeliveryStatus): Promise<{ data: Delivery[]; count: number }> {
    const qs = status ? `?status=${status}` : "";
    return this.request("GET", `/v1/deliveries${qs}`);
  }

  /** Get a specific delivery */
  async getDelivery(id: string): Promise<Delivery> {
    return this.request("GET", `/v1/deliveries/${id}`);
  }

  /** Update delivery status (e.g., PICKED_UP, DELIVERING, DELIVERED) */
  async updateStatus(deliveryId: string, status: DeliveryStatus): Promise<Delivery> {
    return this.request("PATCH", `/v1/deliveries/${deliveryId}/status`, { status });
  }

  /** Send a single location update for a delivery */
  async sendLocation(
    deliveryId: string,
    location: LocationUpdate
  ): Promise<{ ok: boolean; eta: ETAResult }> {
    return this.request("POST", `/v1/deliveries/${deliveryId}/location`, location);
  }

  // ─── GPS Tracking (REST-based) ───

  /**
   * Start continuous GPS tracking for a delivery.
   * Uses the browser/RN Geolocation API and sends updates via REST.
   */
  startTracking(deliveryId: string, options: GPSTrackingOptions = {}): void {
    const {
      interval = 5000,
      distanceFilter = 10,
      highAccuracy = true,
      onUpdate,
      onError,
    } = options;

    if (this.trackingInterval || this.watchId !== null) {
      this.stopTracking();
    }

    // Use geolocation watch for continuous position
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      let lastSendTime = 0;

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (now - lastSendTime < interval) return;

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Distance filter: skip if barely moved
          if (this.lastLat !== null && this.lastLng !== null) {
            const dist = haversineMeters(this.lastLat, this.lastLng, lat, lng);
            if (dist < distanceFilter) return;
          }

          this.lastLat = lat;
          this.lastLng = lng;
          lastSendTime = now;

          const loc: LocationUpdate = {
            lat,
            lng,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed
              ? position.coords.speed * 3.6 // m/s → km/h
              : undefined,
          };

          this.sendLocation(deliveryId, loc)
            .then((res) => onUpdate?.(loc, res.eta))
            .catch((err) => onError?.(err));
        },
        (err) => onError?.(new Error(err.message)),
        {
          enableHighAccuracy: highAccuracy,
        }
      );
    } else {
      onError?.(new Error("Geolocation API not available"));
    }
  }

  /** Stop GPS tracking */
  stopTracking(): void {
    if (this.watchId !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.lastLat = null;
    this.lastLng = null;
  }

  // ─── WebSocket streaming ───

  /**
   * Connect to the driver WebSocket for low-latency location streaming.
   * Alternative to REST-based tracking for high-frequency updates.
   */
  connectWebSocket(options?: {
    onConnected?: () => void;
    onError?: (error: Event | Error) => void;
    onClose?: () => void;
  }): void {
    if (this.ws) {
      this.disconnectWebSocket();
    }

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      options?.onConnected?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "error") {
          options?.onError?.(new Error(msg.message));
        }
      } catch {
        // ignore
      }
    };

    this.ws.onerror = (event) => {
      options?.onError?.(event);
    };

    this.ws.onclose = () => {
      options?.onClose?.();
    };
  }

  /** Send location via WebSocket (must be connected first) */
  sendLocationWS(trackingCode: string, location: LocationUpdate): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected. Call connectWebSocket() first.");
    }

    this.ws.send(
      JSON.stringify({
        type: "location",
        trackingCode,
        ...location,
      })
    );
  }

  /** Disconnect WebSocket */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── Driver status ───

  /** Set driver online/offline */
  async setOnlineStatus(driverId: string, isOnline: boolean): Promise<void> {
    await this.request("PATCH", `/v1/drivers/${driverId}/status`, { isOnline });
  }

  /** Update driver's own location (independent of a specific delivery) */
  async updateDriverLocation(driverId: string, location: LocationUpdate): Promise<void> {
    await this.request("POST", `/v1/drivers/${driverId}/location`, location);
  }

  // ─── Cleanup ───

  /** Stop all tracking and close connections */
  destroy(): void {
    this.stopTracking();
    this.disconnectWebSocket();
  }
}

// ─── Utility: Haversine distance in meters ───

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Default export ───
export default TrackKitDriver;
