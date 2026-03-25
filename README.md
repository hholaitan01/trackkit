# TrackKit

[![API Status](https://img.shields.io/badge/API-live-22c55e?style=flat-square)](https://trackkitapi-production.up.railway.app/health)
[![Landing Page](https://img.shields.io/badge/site-track--kit.vercel.app-38bdf8?style=flat-square)](https://track-kit.vercel.app)
[![npm](https://img.shields.io/npm/v/trackkit-sdk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/trackkit-sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)

**Real-time delivery tracking infrastructure. The open source alternative to Google Maps for logistics.**

No API keys from Google. No billing surprises. Built on OpenStreetMap.

TrackKit gives delivery and ride-sharing apps everything they need: an embeddable tracking widget, REST + WebSocket APIs, auto-ETA, webhooks, and multi-tenant white-labeling — all for a fraction of what Google Maps charges.

**[Live Site](https://track-kit.vercel.app)** · **[API Docs](https://track-kit.vercel.app/docs)** · **[npm SDK](https://www.npmjs.com/package/trackkit-sdk)**

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

### 1. Get your API keys

```bash
curl -X POST https://trackkitapi-production.up.railway.app/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name": "My Delivery App"}'
```

Response:

```json
{
  "tenant": { "id": "clx...", "name": "My Delivery App", "slug": "my-delivery-app-a1b2c3", "plan": "FREE" },
  "keys": {
    "test": { "id": "clx...", "key": "tk_test_..." },
    "live": { "id": "clx...", "key": "tk_live_..." }
  },
  "message": "Save your API keys — they won't be shown again in full."
}
```

Or sign up at [track-kit.vercel.app](https://track-kit.vercel.app) — click **Start Free**.

### 2. Create a delivery

```bash
curl -X POST https://trackkitapi-production.up.railway.app/v1/deliveries \
  -H "Authorization: Bearer tk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": { "address": "Chicken Republic, Yaba, Lagos, Nigeria" },
    "dropoff": { "address": "12 Adeola Odeku, Victoria Island, Lagos, Nigeria" },
    "externalId": "ORDER-9842",
    "metadata": { "customerName": "Tunde", "items": ["Jollof Rice x2", "Chicken x1"] }
  }'
```

Returns a `trackingCode`, `trackingUrl`, ETA, and geocoded coordinates.

### 3. Update driver location

```bash
curl -X POST https://trackkitapi-production.up.railway.app/v1/deliveries/DELIVERY_ID/location \
  -H "Authorization: Bearer tk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lat": 6.4738, "lng": 3.3952, "speed": 35}'
```

### 4. Or use the SDK

```bash
npm install trackkit-sdk
```

```typescript
import TrackKit from 'trackkit-sdk'

const tk = new TrackKit({ apiKey: 'tk_test_YOUR_KEY' })

// Create a delivery
const delivery = await tk.deliveries.create({
  pickup: { address: 'Yaba Tech, Lagos, Nigeria' },
  dropoff: { address: 'Victoria Island, Lagos, Nigeria' },
  metadata: { orderId: 'ORD-123' }
})

console.log(delivery.trackingUrl)

// Update driver location (from driver app)
await tk.deliveries.updateLocation(delivery.id, {
  lat: 6.4738, lng: 3.3952, speed: 35
})

// Subscribe to real-time updates
const unsub = tk.realtime.subscribe(delivery.trackingCode, {
  onLocation: (data) => console.log(`Driver at ${data.lat}, ${data.lng}`),
  onStatus: (data) => console.log(`Status: ${data.status}`),
  onDelivered: () => console.log('Order delivered!')
})
```

### 5. Receive webhooks

```json
{
  "event": "delivery.status_changed",
  "data": {
    "id": "clx7abc123",
    "trackingCode": "TK-J8K2M1",
    "status": "ARRIVING",
    "previousStatus": "DELIVERING"
  },
  "timestamp": "2026-03-20T14:30:00Z",
  "id": "wh_1710940200_abc123"
}
```

## Live Deployment

| Service | URL |
|---|---|
| API | https://trackkitapi-production.up.railway.app |
| Health Check | https://trackkitapi-production.up.railway.app/health |
| Landing Page | https://track-kit.vercel.app |
| Docs | https://track-kit.vercel.app/docs |
| npm SDK | https://www.npmjs.com/package/trackkit-sdk |

## Architecture

```
Customer App (your app)
    │ embeds
    ▼
TrackKit Widget ◄──── WebSocket ────► TrackKit API (Railway)
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

| Package | Description | Status |
|---|---|---|
| [`trackkit-sdk`](https://www.npmjs.com/package/trackkit-sdk) | TypeScript SDK for the TrackKit API | Published on npm |
| `@trackkit/widget` | Embeddable tracking widget (drop-in JS) | In progress |
| `@trackkit/api` | Fastify API server (self-hostable) | Live on Railway |

## API Reference

Full docs at **[track-kit.vercel.app/docs](https://track-kit.vercel.app/docs)**.

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

### Auth (public)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/auth/signup` | Create tenant + API keys |

### WebSocket

Connect to `wss://trackkitapi-production.up.railway.app/ws/track/:trackingCode` for real-time updates:

```json
// Location update
{ "type": "location", "data": { "lat": 6.47, "lng": 3.39, "eta": 5, "speed": 32 } }

// Status change
{ "type": "status", "data": { "status": "ARRIVING", "eta": 2 } }
```

### Public Tracking (no auth)

`GET /track/:trackingCode` — Returns delivery info for the embeddable widget. No API key required.

## Plan Limits

| Plan | Deliveries/mo | API calls/min | Webhooks |
|---|---|---|---|
| Free | 500 | 100 | 1 |
| Growth ($49/mo) | 5,000 | 500 | 5 |
| Scale ($199/mo) | 50,000 | 2,000 | 20 |
| Managed (custom) | Unlimited | 10,000 | 100 |

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
git clone https://github.com/hholaitan01/trackkit
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
