# TrackKit

**Real-time delivery tracking infrastructure. The open source alternative to Google Maps for logistics.**

No API keys from Google. No billing surprises. Built on OpenStreetMap.

TrackKit gives delivery and ride-sharing apps everything they need: an embeddable tracking widget, REST + WebSocket APIs, auto-ETA, webhooks, and multi-tenant white-labeling — all for a fraction of what Google Maps charges.

## Why TrackKit?

Google Maps charges ~$7 per 1,000 routes. A delivery startup doing 10K deliveries/day pays **$2,100/month** just on routing.

TrackKit uses free, open-source mapping infrastructure. Your cost: **$0 for maps. $5/mo for a VPS.**

| | Google Maps | TrackKit |
|---|---|---|
| 10K routes/day | $2,100/mo | $0 (self-hosted) |
| Real-time tracking | Build yourself | Built-in |
| Customer tracking widget | Build yourself | 3 lines of code |
| Webhooks | Build yourself | Built-in |
| Setup time | Weeks | Minutes |
| Vendor lock-in | Yes | MIT licensed |

## Quick Start

### 1. Embed the tracking widget (3 lines)

```html
<div id="trackkit"
  data-key="tk_live_abc123"
  data-delivery="TK-2847"
></div>
<script src="https://cdn.trackkit.dev/v1/widget.js"></script>
```

### 2. Or use the SDK

```bash
npm install @trackkit/sdk
```

```typescript
import TrackKit from '@trackkit/sdk'

const tk = new TrackKit({ apiKey: 'tk_live_abc123' })

// Create a delivery
const delivery = await tk.deliveries.create({
  pickup: { address: 'Yaba Tech, Lagos' },
  dropoff: { address: 'Victoria Island, Lagos' },
  metadata: { orderId: 'ORD-123' }
})

console.log(delivery.trackingUrl)
// → https://yourapp.trackkit.dev/track/TK-ABC123

// Update driver location (from driver app)
await tk.deliveries.updateLocation(delivery.id, {
  lat: 6.4738,
  lng: 3.3952,
  speed: 35
})

// Subscribe to real-time updates
const unsub = tk.realtime.subscribe('TK-ABC123', {
  onLocation: (data) => console.log(`Driver at ${data.lat}, ${data.lng}`),
  onStatus: (data) => console.log(`Status: ${data.status}`),
  onDelivered: () => console.log('Order delivered!')
})
```

### 3. Receive webhooks

```json
{
  "event": "delivery.status_changed",
  "data": {
    "id": "del_2847",
    "trackingCode": "TK-2847",
    "status": "ARRIVING",
    "previousStatus": "DELIVERING"
  }
}
```

## Architecture

```
Customer App (your app)
    │ embeds
    ▼
TrackKit Widget ◄──── WebSocket ────► TrackKit API
    (JS SDK)                              │
                                          │ receives GPS
                                          ▼
                                    Driver App
                                    (your driver app,
                                     POST /location)
                                          │
TrackKit API uses:                        │
├── Valhalla (routing + ETA)              │
├── Nominatim (geocoding)           Webhooks ──► Your Backend
├── MapLibre GL (map rendering)           │
└── OpenFreeMap (map tiles)         SMS / WhatsApp / Push
```

## Packages

| Package | Description |
|---|---|
| `@trackkit/sdk` | TypeScript SDK for the TrackKit API |
| `@trackkit/widget` | Embeddable tracking widget (drop-in JS) |
| `@trackkit/api` | Fastify API server (self-hostable) |

## API Reference

### Deliveries

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/deliveries` | Create a delivery |
| `GET` | `/v1/deliveries/:id` | Get delivery details |
| `GET` | `/v1/deliveries` | List deliveries |
| `PATCH` | `/v1/deliveries/:id/status` | Update status |
| `POST` | `/v1/deliveries/:id/location` | Update driver location |
| `POST` | `/v1/deliveries/:id/assign` | Assign driver |

### Drivers

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/drivers` | Create a driver |
| `GET` | `/v1/drivers` | List drivers |
| `GET` | `/v1/drivers/:id` | Get driver details |
| `POST` | `/v1/drivers/:id/location` | Update driver location |
| `PATCH` | `/v1/drivers/:id/status` | Set online/offline |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/webhooks` | Create webhook |
| `GET` | `/v1/webhooks` | List webhooks |
| `DELETE` | `/v1/webhooks/:id` | Delete webhook |

### WebSocket

Connect to `wss://api.trackkit.dev/ws/track/:trackingCode` to receive real-time updates:

```json
// Location update
{ "type": "location", "data": { "lat": 6.47, "lng": 3.39, "eta": 5, "speed": 32 } }

// Status change
{ "type": "status", "data": { "status": "ARRIVING", "eta": 2 } }
```

### Public Tracking (no auth)

`GET /track/:trackingCode` — Returns delivery info for the embeddable widget. No API key required.

## Self-Hosting

For production, self-host the routing infrastructure to avoid rate limits on public OSM endpoints:

```bash
git clone https://github.com/hholaitan01/trackkit
cd trackkit
cp apps/api/.env.example apps/api/.env
# Edit .env with your database URL

docker compose up -d
```

This spins up:
- **PostgreSQL** — delivery data
- **Valhalla** — routing + ETA (downloads Nigeria OSM data on first run)
- **Nominatim** — geocoding (downloads Nigeria OSM data on first run)
- **TrackKit API** — your server

First startup takes 15-30 minutes while OSM data downloads and indexes. After that, restarts are instant.

**Change region:** Edit `docker-compose.yml` and replace the Nigeria PBF URL with your target region from [Geofabrik](https://download.geofabrik.de/).

## Development

```bash
git clone https://github.com/yourusername/trackkit
cd trackkit
pnpm install

# Start the API (needs PostgreSQL running)
cp apps/api/.env.example apps/api/.env
pnpm db:migrate
pnpm dev:api

# Build all packages
pnpm build
```

## Roadmap

- [ ] Admin dashboard (Next.js)
- [ ] React Native driver SDK
- [ ] Analytics (avg delivery time, driver heatmaps)
- [ ] Multi-region support (auto-select nearest Valhalla instance)
- [ ] n8n integration nodes
- [ ] Stripe billing integration

## License

MIT
