# TrackKit API — Quick Start

## Authentication

All API requests require a Bearer token:

```
Authorization: Bearer tk_test_demo_abc123xyz
```

Get your API key from the seed data or create one via the API.

Test keys (`tk_test_*`) work in sandbox mode. Live keys (`tk_live_*`) create real deliveries.

## Complete Integration Example

Here's how Chowdeck (or any delivery app) would integrate TrackKit:

### Step 1: Create a delivery when customer places an order

```typescript
// In your order service
const response = await fetch('https://trackkitapi-production.up.railway.app/v1/deliveries', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tk_test_demo_abc123xyz',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pickup: { address: 'Chicken Republic, Yaba, Lagos' },
    dropoff: { address: '12 Adeola Odeku, Victoria Island, Lagos' },
    externalId: 'ORDER-9842',  // your own order ID
    metadata: {
      customerName: 'Tunde',
      customerPhone: '+2348012345678',
      items: ['Jollof Rice x2', 'Chicken x1']
    }
  })
})

const delivery = await response.json()
// {
//   id: "clx7abc123...",
//   trackingCode: "TK-J8K2M1",
//   trackingUrl: "https://trackkitapi-production.up.railway.app/track/TK-J8K2M1",
//   status: "PENDING",
//   eta: { minutes: 25, distanceKm: 8.2 },
//   ...
// }

// Send tracking link to customer via SMS/WhatsApp
sendSMS(customer.phone, `Track your order: ${delivery.trackingUrl}`)
```

### Step 2: Assign a driver

```typescript
// When a driver accepts the order
await fetch(`https://trackkitapi-production.up.railway.app/v1/deliveries/${delivery.id}/assign`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tk_test_demo_abc123xyz',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ driverId: 'driver_456' })
})
```

### Step 3: Stream driver location (from driver app)

```typescript
// In your driver app — call every 5-10 seconds
navigator.geolocation.watchPosition(async (pos) => {
  await fetch(`https://trackkitapi-production.up.railway.app/v1/deliveries/${deliveryId}/location`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer tk_test_demo_abc123xyz',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      speed: pos.coords.speed,
      heading: pos.coords.heading
    })
  })
}, null, { enableHighAccuracy: true })
```

### Step 4: Customer sees live tracking

The customer clicks the tracking URL and sees a live map with:
- Driver location updating in real-time
- ETA countdown
- Status updates (picked up → on the way → arriving → delivered)
- Your branding (logo, colors)

No code needed on the customer side — it just works.

### Step 5: Receive webhooks for backend logic

```typescript
// Register a webhook
await fetch('https://trackkitapi-production.up.railway.app/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tk_test_demo_abc123xyz',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://yourapp.com/webhooks/trackkit',
    events: [
      'delivery.status_changed',
      'delivery.driver_assigned'
    ]
  })
})
```

Your webhook endpoint receives:

```json
{
  "event": "delivery.status_changed",
  "data": {
    "id": "clx7abc123",
    "trackingCode": "TK-J8K2M1",
    "status": "DELIVERED",
    "previousStatus": "ARRIVING"
  },
  "timestamp": "2026-03-20T14:30:00Z",
  "id": "wh_1710940200_abc123"
}
```

Verify the signature:
```typescript
const signature = request.headers['x-trackkit-signature']
const expected = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(request.body))
  .digest('hex')

if (`sha256=${expected}` !== signature) {
  return res.status(401).send('Invalid signature')
}
```

## Status Flow

```
PENDING → CONFIRMED → DRIVER_ASSIGNED → PICKUP_EN_ROUTE → PICKED_UP → DELIVERING → ARRIVING → DELIVERED
                                                                                          ↘ CANCELLED
```

## Rate Limits

| Plan | Deliveries/mo | API calls/min |
|---|---|---|
| Free | 500 | 100 |
| Growth ($49/mo) | 5,000 | 500 |
| Scale ($199/mo) | 50,000 | 2,000 |
| Managed (custom) | Unlimited | Unlimited |

## Webhook Events

| Event | Fired when |
|---|---|
| `delivery.created` | New delivery created |
| `delivery.status_changed` | Status transitions |
| `delivery.driver_assigned` | Driver assigned to delivery |
| `delivery.location_updated` | Driver location update received |
