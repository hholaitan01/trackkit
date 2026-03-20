/**
 * TrackKit Embeddable Widget
 *
 * Usage:
 *   <div id="trackkit" data-key="tk_live_xxx" data-delivery="TK-ABC123"></div>
 *   <script src="https://cdn.trackkit.dev/v1/widget.js"></script>
 *
 * Or programmatically:
 *   TrackKit.embed({ container: '#trackkit', deliveryId: 'TK-ABC123', apiKey: 'tk_live_xxx' })
 */

import maplibregl from "maplibre-gl";

interface TrackKitConfig {
  container: string | HTMLElement;
  deliveryId: string;
  apiKey?: string;
  apiUrl?: string;
  wsUrl?: string;
  theme?: "dark" | "light";
  showETA?: boolean;
  showStatus?: boolean;
  showRoute?: boolean;
  brandColor?: string;
  onStatusChange?: (status: string) => void;
  onETAUpdate?: (eta: number) => void;
  onDelivered?: () => void;
}

interface DeliveryData {
  trackingCode: string;
  status: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  driver: { name: string; lat: number; lng: number; heading: number } | null;
  eta: number | null;
  distance: number | null;
  routePolyline: string | null;
  brand: { name: string; logo: string | null; color: string };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Order Confirmed",
  DRIVER_ASSIGNED: "Driver Assigned",
  PICKUP_EN_ROUTE: "Driver Heading to Pickup",
  PICKED_UP: "Order Picked Up",
  DELIVERING: "On the Way",
  ARRIVING: "Almost There!",
  DELIVERED: "Delivered!",
  CANCELLED: "Cancelled",
};

const DEFAULT_API_URL = "https://api.trackkit.dev";
const DEFAULT_WS_URL = "wss://api.trackkit.dev/ws";
const TILE_URL = "https://tiles.openfreemap.org/styles/liberty";

class TrackKitWidget {
  private config: Required<TrackKitConfig>;
  private container: HTMLElement;
  private map: maplibregl.Map | null = null;
  private ws: WebSocket | null = null;
  private driverMarker: maplibregl.Marker | null = null;
  private delivery: DeliveryData | null = null;
  private elements: Record<string, HTMLElement> = {};
  private reconnectTimer: any = null;
  private destroyed = false;

  constructor(config: TrackKitConfig) {
    this.config = {
      apiKey: "",
      apiUrl: DEFAULT_API_URL,
      wsUrl: DEFAULT_WS_URL,
      theme: "dark",
      showETA: true,
      showStatus: true,
      showRoute: true,
      brandColor: "#38bdf8",
      onStatusChange: () => {},
      onETAUpdate: () => {},
      onDelivered: () => {},
      ...config,
    } as Required<TrackKitConfig>;

    const el =
      typeof config.container === "string"
        ? document.querySelector(config.container)
        : config.container;

    if (!el) throw new Error(`TrackKit: Container "${config.container}" not found`);
    this.container = el as HTMLElement;

    this.init();
  }

  private async init() {
    this.injectStyles();
    this.renderSkeleton();

    try {
      // Fetch delivery data
      const res = await fetch(
        `${this.config.apiUrl}/track/${this.config.deliveryId}`
      );
      if (!res.ok) throw new Error("Delivery not found");

      this.delivery = await res.json();
      if (this.delivery!.brand?.color) {
        this.config.brandColor = this.delivery!.brand.color;
      }

      this.render();
      this.initMap();
      this.connectWebSocket();
    } catch (err) {
      this.renderError("Unable to load tracking information");
    }
  }

  private injectStyles() {
    if (document.getElementById("trackkit-styles")) return;

    const isDark = this.config.theme === "dark";
    const style = document.createElement("style");
    style.id = "trackkit-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

      .tk-widget {
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        background: ${isDark ? "#0c1222" : "#ffffff"};
        color: ${isDark ? "#f0f9ff" : "#0f172a"};
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid ${isDark ? "rgba(56,189,248,0.12)" : "rgba(0,0,0,0.08)"};
        box-shadow: 0 4px 24px ${isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)"};
        width: 100%;
        max-width: 420px;
      }

      .tk-header {
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${isDark ? "rgba(56,189,248,0.08)" : "rgba(0,0,0,0.06)"};
      }

      .tk-header-left { display: flex; align-items: center; gap: 10px; }

      .tk-brand-logo {
        width: 28px; height: 28px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 13px;
      }

      .tk-header-title { font-size: 13px; font-weight: 700; }
      .tk-header-sub { font-size: 10px; opacity: 0.5; margin-top: 1px; }

      .tk-status-badge {
        padding: 4px 10px; border-radius: 20px;
        font-size: 10px; font-weight: 600;
        transition: all 0.4s ease;
      }

      .tk-map { width: 100%; height: 200px; }

      .tk-stats {
        display: grid; grid-template-columns: 1fr 1fr 1fr;
        padding: 14px 0;
        border-top: 1px solid ${isDark ? "rgba(56,189,248,0.08)" : "rgba(0,0,0,0.06)"};
        border-bottom: 1px solid ${isDark ? "rgba(56,189,248,0.08)" : "rgba(0,0,0,0.06)"};
      }

      .tk-stat { text-align: center; }
      .tk-stat-value {
        font-size: 20px; font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
      }
      .tk-stat-label {
        font-size: 9px; font-weight: 600; opacity: 0.4;
        letter-spacing: 0.06em; margin-top: 2px;
      }

      .tk-progress {
        padding: 12px 18px 14px;
      }
      .tk-progress-bar {
        height: 3px; border-radius: 2px;
        background: ${isDark ? "rgba(56,189,248,0.1)" : "rgba(0,0,0,0.06)"};
        overflow: hidden;
      }
      .tk-progress-fill {
        height: 100%; border-radius: 2px;
        transition: width 0.5s ease;
      }
      .tk-progress-labels {
        display: flex; justify-content: space-between;
        margin-top: 6px; font-size: 10px; opacity: 0.35;
      }

      .tk-skeleton {
        animation: tk-pulse 1.5s ease-in-out infinite;
      }
      @keyframes tk-pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }

      .tk-error {
        padding: 40px 20px; text-align: center;
        font-size: 13px; opacity: 0.5;
      }

      .tk-powered {
        padding: 8px 18px; text-align: center;
        font-size: 9px; opacity: 0.25;
        border-top: 1px solid ${isDark ? "rgba(56,189,248,0.06)" : "rgba(0,0,0,0.04)"};
      }
      .tk-powered a { color: inherit; text-decoration: none; }
      .tk-powered a:hover { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  private renderSkeleton() {
    this.container.innerHTML = `
      <div class="tk-widget">
        <div class="tk-header">
          <div class="tk-header-left">
            <div class="tk-skeleton" style="width:28px;height:28px;border-radius:8px;background:rgba(56,189,248,0.1)"></div>
            <div>
              <div class="tk-skeleton" style="width:100px;height:12px;border-radius:4px;background:rgba(56,189,248,0.1)"></div>
              <div class="tk-skeleton" style="width:60px;height:8px;border-radius:4px;background:rgba(56,189,248,0.1);margin-top:4px"></div>
            </div>
          </div>
        </div>
        <div class="tk-map tk-skeleton" style="background:rgba(56,189,248,0.05)"></div>
        <div class="tk-stats">
          <div class="tk-stat"><div class="tk-skeleton" style="width:40px;height:16px;margin:0 auto;border-radius:4px;background:rgba(56,189,248,0.1)"></div></div>
          <div class="tk-stat"><div class="tk-skeleton" style="width:40px;height:16px;margin:0 auto;border-radius:4px;background:rgba(56,189,248,0.1)"></div></div>
          <div class="tk-stat"><div class="tk-skeleton" style="width:40px;height:16px;margin:0 auto;border-radius:4px;background:rgba(56,189,248,0.1)"></div></div>
        </div>
      </div>
    `;
  }

  private render() {
    if (!this.delivery) return;
    const d = this.delivery;
    const color = this.config.brandColor;

    this.container.innerHTML = `
      <div class="tk-widget">
        <div class="tk-header">
          <div class="tk-header-left">
            <div class="tk-brand-logo" style="background:${color};color:#0a0f1a">
              ${d.brand.logo ? `<img src="${d.brand.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>` : d.brand.name.charAt(0)}
            </div>
            <div>
              <div class="tk-header-title">${d.trackingCode}</div>
              <div class="tk-header-sub">${this.truncate(d.pickup.address, 20)} → ${this.truncate(d.dropoff.address, 20)}</div>
            </div>
          </div>
          <div class="tk-status-badge" id="tk-status" style="background:${color}18;border:1px solid ${color}30;color:${color}">
            ${STATUS_LABELS[d.status] || d.status}
          </div>
        </div>
        <div class="tk-map" id="tk-map"></div>
        <div class="tk-stats">
          <div class="tk-stat">
            <div class="tk-stat-value" id="tk-eta" style="color:${color}">${d.eta ?? "--"} min</div>
            <div class="tk-stat-label">ETA</div>
          </div>
          <div class="tk-stat">
            <div class="tk-stat-value" id="tk-distance">${d.distance?.toFixed(1) ?? "--"} km</div>
            <div class="tk-stat-label">DISTANCE</div>
          </div>
          <div class="tk-stat">
            <div class="tk-stat-value" id="tk-speed">-- km/h</div>
            <div class="tk-stat-label">SPEED</div>
          </div>
        </div>
        <div class="tk-progress">
          <div class="tk-progress-bar">
            <div class="tk-progress-fill" id="tk-progress-fill" style="width:${this.getProgress()}%;background:${color}"></div>
          </div>
          <div class="tk-progress-labels">
            <span>${this.truncate(d.pickup.address, 15)}</span>
            <span>${this.truncate(d.dropoff.address, 15)}</span>
          </div>
        </div>
        <div class="tk-powered">Powered by <a href="https://trackkit.dev" target="_blank">TrackKit</a></div>
      </div>
    `;

    // Cache DOM refs
    this.elements = {
      status: document.getElementById("tk-status")!,
      eta: document.getElementById("tk-eta")!,
      distance: document.getElementById("tk-distance")!,
      speed: document.getElementById("tk-speed")!,
      progressFill: document.getElementById("tk-progress-fill")!,
    };
  }

  private initMap() {
    if (!this.delivery) return;
    const d = this.delivery;

    const mapEl = document.getElementById("tk-map");
    if (!mapEl) return;

    const center: [number, number] = [
      (d.pickup.lng + d.dropoff.lng) / 2,
      (d.pickup.lat + d.dropoff.lat) / 2,
    ];

    this.map = new maplibregl.Map({
      container: mapEl,
      style: TILE_URL,
      center,
      zoom: 12,
      attributionControl: false,
    });

    this.map.on("load", () => {
      if (!this.map || !this.delivery) return;

      // Pickup marker
      const pickupEl = this.createMarkerEl("#22c55e");
      new maplibregl.Marker({ element: pickupEl })
        .setLngLat([d.pickup.lng, d.pickup.lat])
        .addTo(this.map);

      // Dropoff marker
      const dropoffEl = this.createMarkerEl("#ef4444");
      new maplibregl.Marker({ element: dropoffEl })
        .setLngLat([d.dropoff.lng, d.dropoff.lat])
        .addTo(this.map);

      // Driver marker
      if (d.driver?.lat && d.driver?.lng) {
        const driverEl = this.createDriverMarkerEl();
        this.driverMarker = new maplibregl.Marker({ element: driverEl })
          .setLngLat([d.driver.lng, d.driver.lat])
          .addTo(this.map);
      }

      // Fit bounds
      const bounds = new maplibregl.LngLatBounds()
        .extend([d.pickup.lng, d.pickup.lat])
        .extend([d.dropoff.lng, d.dropoff.lat]);
      if (d.driver?.lat) bounds.extend([d.driver.lng, d.driver.lat]);

      this.map.fitBounds(bounds, { padding: 40, maxZoom: 15 });

      // TODO: Decode and render route polyline if available
    });
  }

  private connectWebSocket() {
    if (this.destroyed) return;

    const url = `${this.config.wsUrl}/track/${this.config.deliveryId}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleWSMessage(msg);
      } catch {}
    };

    this.ws.onclose = () => {
      if (!this.destroyed) {
        // Reconnect with backoff
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    // Keep alive
    const pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  private handleWSMessage(msg: any) {
    if (msg.type === "location") {
      const { lat, lng, heading, speed, eta, distance, status } = msg.data;

      // Update driver marker
      if (this.driverMarker && lat && lng) {
        this.driverMarker.setLngLat([lng, lat]);
      } else if (!this.driverMarker && lat && lng && this.map) {
        const driverEl = this.createDriverMarkerEl();
        this.driverMarker = new maplibregl.Marker({ element: driverEl })
          .setLngLat([lng, lat])
          .addTo(this.map);
      }

      // Update stats
      if (this.elements.eta && eta != null) {
        this.elements.eta.textContent = `${eta} min`;
        this.config.onETAUpdate(eta);
      }
      if (this.elements.distance && distance != null) {
        this.elements.distance.textContent = `${distance.toFixed(1)} km`;
      }
      if (this.elements.speed && speed != null) {
        this.elements.speed.textContent = `${Math.round(speed)} km/h`;
      }

      if (status && this.delivery) {
        this.delivery.status = status;
        this.updateStatus(status);
      }
    }

    if (msg.type === "status") {
      const { status } = msg.data;
      if (this.delivery) this.delivery.status = status;
      this.updateStatus(status);
      this.config.onStatusChange(status);

      if (status === "DELIVERED") {
        this.config.onDelivered();
      }
    }
  }

  private updateStatus(status: string) {
    if (this.elements.status) {
      this.elements.status.textContent = STATUS_LABELS[status] || status;
    }
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${this.getProgress()}%`;
    }
  }

  private getProgress(): number {
    if (!this.delivery) return 0;
    const statusOrder = [
      "PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "PICKUP_EN_ROUTE",
      "PICKED_UP", "DELIVERING", "ARRIVING", "DELIVERED",
    ];
    const idx = statusOrder.indexOf(this.delivery.status);
    if (idx === -1) return 0;
    return Math.round((idx / (statusOrder.length - 1)) * 100);
  }

  private createMarkerEl(color: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      width: 14px; height: 14px; border-radius: 50%;
      background: ${color}; border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    return el;
  }

  private createDriverMarkerEl(): HTMLElement {
    const el = document.createElement("div");
    const color = this.config.brandColor;
    el.style.cssText = `
      width: 18px; height: 18px; border-radius: 50%;
      background: ${color}; border: 3px solid #fff;
      box-shadow: 0 0 12px ${color}80, 0 2px 8px rgba(0,0,0,0.3);
    `;

    // Pulse animation
    const pulse = document.createElement("div");
    pulse.style.cssText = `
      position: absolute; top: -6px; left: -6px;
      width: 30px; height: 30px; border-radius: 50%;
      background: ${color}30;
      animation: tk-marker-pulse 2s ease-in-out infinite;
    `;
    el.style.position = "relative";
    el.appendChild(pulse);

    // Add pulse keyframe if not exists
    if (!document.getElementById("tk-marker-pulse-style")) {
      const style = document.createElement("style");
      style.id = "tk-marker-pulse-style";
      style.textContent = `
        @keyframes tk-marker-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    return el;
  }

  private truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len) + "…" : str;
  }

  destroy() {
    this.destroyed = true;
    this.ws?.close();
    this.map?.remove();
    clearTimeout(this.reconnectTimer);
    this.container.innerHTML = "";
  }
}

// ─── Auto-init from data attributes ───
function autoInit() {
  const el = document.querySelector("[data-trackkit], #trackkit");
  if (!el) return;

  const deliveryId = el.getAttribute("data-delivery") || el.getAttribute("data-tracking-code");
  const apiKey = el.getAttribute("data-key") || "";

  if (!deliveryId) return;

  new TrackKitWidget({
    container: el as HTMLElement,
    deliveryId,
    apiKey,
    theme: (el.getAttribute("data-theme") as "dark" | "light") || "dark",
    apiUrl: el.getAttribute("data-api-url") || DEFAULT_API_URL,
  });
}

// Auto-init on DOM ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
}

// ─── Public API ───
export { TrackKitWidget };
export default {
  embed: (config: TrackKitConfig) => new TrackKitWidget(config),
};
