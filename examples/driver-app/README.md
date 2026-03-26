# TrackKit Driver Demo App

A simple mobile web app that demonstrates how to build a driver-side app using the TrackKit API. It uses the browser's Geolocation API to send real GPS coordinates to the TrackKit API in real-time.

## What it does

1. **Authenticates** with a TrackKit API key
2. **Lists active deliveries** assigned to the tenant
3. **Sends live GPS** to `POST /v1/deliveries/:id/location` every 5 seconds
4. **Updates delivery status** (Pickup En Route → Picked Up → Delivering → Delivered)

The API automatically recalculates ETA, broadcasts location via WebSocket to tracking widget subscribers, and triggers status transitions when the driver is close to the dropoff point.

## How to run

Just open `index.html` in a browser — no build step, no dependencies.

```bash
# Option A: Open directly
open examples/driver-app/index.html

# Option B: Serve locally
npx serve examples/driver-app
```

For GPS to work, you need either:
- A mobile device with location services enabled
- A desktop browser with location permissions granted (will use Wi-Fi/IP geolocation)

> **Tip:** On Chrome desktop, you can simulate GPS coordinates via DevTools → Sensors → Geolocation.

## How to test the full flow

1. Go to [track-kit.vercel.app/signup](https://track-kit.vercel.app/signup) and create an account
2. In the [dashboard](https://track-kit.vercel.app/dashboard/deliveries), create a delivery
3. Open this driver app on your phone and paste your API key
4. Select the delivery and tap **Start Tracking**
5. Open the delivery's tracking URL in another tab — you'll see the driver dot moving in real-time

## Key API calls

```javascript
// Send driver location (every 5 seconds)
fetch(`${API}/v1/deliveries/${deliveryId}/location`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    speed: position.coords.speed,
    heading: position.coords.heading
  })
})

// Update delivery status
fetch(`${API}/v1/deliveries/${deliveryId}/status`, {
  method: "PATCH",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ status: "DELIVERING" })
})
```

## Stack

Zero dependencies. Single HTML file with vanilla JavaScript. Designed to be a clear, readable reference for implementing TrackKit in any driver app — React Native, Flutter, Swift, Kotlin, or anything else that can call HTTP APIs.
