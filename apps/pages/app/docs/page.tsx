"use client";

import { useState } from "react";
import Link from "next/link";

const API_BASE = "https://trackkitapi-production.up.railway.app";

const sections = [
  { id: "auth", label: "Authentication" },
  { id: "quickstart", label: "Quick Start" },
  { id: "deliveries", label: "Deliveries" },
  { id: "drivers", label: "Drivers" },
  { id: "webhooks", label: "Webhooks" },
  { id: "tracking", label: "Live Tracking" },
  { id: "status-flow", label: "Status Flow" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "sdk", label: "SDK" },
];

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const plain = code.replace(/<[^>]+>/g, "");

  return (
    <div style={{
      background: "#0c1222", borderRadius: 10,
      border: "1px solid rgba(56, 189, 248, 0.1)",
      overflow: "hidden", margin: "16px 0", position: "relative",
    }}>
      {label && (
        <div style={{
          padding: "8px 14px",
          borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
          fontSize: 11, fontWeight: 600,
          color: "rgba(56, 189, 248, 0.4)",
          letterSpacing: "0.04em",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {label}
          <button onClick={() => { navigator.clipboard.writeText(plain); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{
            padding: "3px 10px", borderRadius: 5,
            border: "1px solid rgba(56, 189, 248, 0.15)",
            background: copied ? "rgba(34, 197, 94, 0.12)" : "transparent",
            color: copied ? "#22c55e" : "rgba(56, 189, 248, 0.4)",
            fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre style={{
        padding: "14px 16px", margin: 0,
        fontSize: 12.5, lineHeight: 1.7,
        color: "#94a3b8", overflowX: "auto",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        <code dangerouslySetInnerHTML={{ __html: code }} />
      </pre>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = { POST: "#22c55e", GET: "#38bdf8", PATCH: "#fbbf24", DELETE: "#ef4444" };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", borderRadius: 8,
      background: "rgba(12, 18, 34, 0.5)",
      border: "1px solid rgba(56, 189, 248, 0.06)",
      margin: "8px 0",
    }}>
      <span style={{
        padding: "3px 8px", borderRadius: 4,
        background: `${colors[method]}18`, color: colors[method],
        fontSize: 10, fontWeight: 800, letterSpacing: "0.03em",
        fontFamily: "'JetBrains Mono', monospace",
        minWidth: 48, textAlign: "center",
      }}>{method}</span>
      <code style={{ fontSize: 13, color: "#f0f9ff", fontFamily: "'JetBrains Mono', monospace" }}>{path}</code>
      <span style={{ fontSize: 12, color: "rgba(148, 163, 184, 0.4)", marginLeft: "auto" }}>{desc}</span>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{
      borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(56, 189, 248, 0.08)",
      margin: "16px 0",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
        padding: "10px 16px",
        background: "rgba(56, 189, 248, 0.04)",
        borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
      }}>
        {headers.map((h, i) => (
          <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "rgba(148, 163, 184, 0.5)", letterSpacing: "0.04em" }}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
          padding: "10px 16px",
          borderBottom: i < rows.length - 1 ? "1px solid rgba(56, 189, 248, 0.05)" : "none",
        }}>
          {row.map((cell, j) => (
            <span key={j} style={{ fontSize: 13, color: j === 0 ? "#f0f9ff" : "rgba(148, 163, 184, 0.6)" }}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
  const [active, setActive] = useState("auth");

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const h2: React.CSSProperties = { fontSize: 24, fontWeight: 800, color: "#f0f9ff", letterSpacing: "-0.02em", margin: "0 0 8px", paddingTop: 48 };
  const h3: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: "#f0f9ff", margin: "28px 0 8px" };
  const p: React.CSSProperties = { fontSize: 14, lineHeight: 1.8, color: "rgba(148, 163, 184, 0.65)", margin: "8px 0" };
  const note: React.CSSProperties = {
    padding: "12px 16px", borderRadius: 8,
    background: "rgba(56, 189, 248, 0.06)",
    border: "1px solid rgba(56, 189, 248, 0.1)",
    fontSize: 13, color: "rgba(148, 163, 184, 0.6)", lineHeight: 1.7,
    margin: "16px 0",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060a14", color: "#f0f9ff", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Nav */}
      <nav style={{
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(56, 189, 248, 0.06)",
        position: "sticky", top: 0,
        background: "rgba(6, 10, 20, 0.9)", backdropFilter: "blur(20px)", zIndex: 100,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#060a14",
          }}>T</div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>TrackKit</span>
          <span style={{ fontSize: 12, color: "rgba(56, 189, 248, 0.4)", fontWeight: 600, marginLeft: 4 }}>Docs</span>
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="https://github.com/hholaitan01/trackkit" target="_blank" rel="noopener noreferrer" style={{
            fontSize: 13, color: "rgba(148, 163, 184, 0.6)", textDecoration: "none", fontWeight: 500,
          }}>GitHub</a>
          <Link href="/signup" style={{
            padding: "8px 18px", borderRadius: 8,
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            border: "none", color: "#060a14",
            fontSize: 12, fontWeight: 700, textDecoration: "none",
          }}>Get API Keys</Link>
        </div>
      </nav>

      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", gap: 0 }}>
        {/* Sidebar */}
        <aside style={{
          width: 200, flexShrink: 0,
          padding: "32px 0 32px 24px",
          position: "sticky", top: 64, height: "calc(100vh - 64px)",
          overflowY: "auto",
        }}>
          {sections.map((s) => (
            <div key={s.id} onClick={() => scrollTo(s.id)} style={{
              padding: "7px 14px", borderRadius: 6,
              fontSize: 13, fontWeight: active === s.id ? 600 : 400,
              color: active === s.id ? "#38bdf8" : "rgba(148, 163, 184, 0.45)",
              cursor: "pointer", transition: "all 0.15s",
              background: active === s.id ? "rgba(56, 189, 248, 0.06)" : "transparent",
              marginBottom: 2,
            }}>{s.label}</div>
          ))}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: "0 40px 80px", maxWidth: 760, minWidth: 0 }}>
          <section id="auth">
            <h2 style={h2}>Authentication</h2>
            <p style={p}>All API requests require a Bearer token in the Authorization header:</p>
            <CodeBlock label="HTTP Header" code={`Authorization: Bearer tk_test_your_key_here`} />
            <div style={note}>
              <strong style={{ color: "#38bdf8" }}>Test vs Live keys:</strong> Test keys (<code style={{ color: "#fbbf24" }}>tk_test_*</code>) work in sandbox mode. Live keys (<code style={{ color: "#22c55e" }}>tk_live_*</code>) create real deliveries.
            </div>
          </section>

          <section id="quickstart">
            <h2 style={h2}>Quick Start</h2>
            <p style={p}>Get live delivery tracking running in 5 minutes.</p>
            <h3 style={h3}>Step 1: Create a delivery</h3>
            <p style={p}>When a customer places an order, create a delivery to get a tracking URL:</p>
            <CodeBlock label="typescript" code={`<span style="color:#c084fc">const</span> response = <span style="color:#c084fc">await</span> <span style="color:#38bdf8">fetch</span>(<span style="color:#86efac">'${API_BASE}/v1/deliveries'</span>, {
  method: <span style="color:#86efac">'POST'</span>,
  headers: {
    <span style="color:#86efac">'Authorization'</span>: <span style="color:#86efac">'Bearer tk_test_your_key'</span>,
    <span style="color:#86efac">'Content-Type'</span>: <span style="color:#86efac">'application/json'</span>
  },
  body: JSON.<span style="color:#fbbf24">stringify</span>({
    pickup:  { address: <span style="color:#86efac">'Chicken Republic, Yaba, Lagos, Nigeria'</span> },
    dropoff: { address: <span style="color:#86efac">'12 Adeola Odeku, VI, Lagos, Nigeria'</span> },
    externalId: <span style="color:#86efac">'ORDER-9842'</span>,
    metadata: {
      customerName: <span style="color:#86efac">'Tunde'</span>,
      items: [<span style="color:#86efac">'Jollof Rice x2'</span>, <span style="color:#86efac">'Chicken x1'</span>]
    }
  })
})

<span style="color:#c084fc">const</span> delivery = <span style="color:#c084fc">await</span> response.<span style="color:#fbbf24">json</span>()
<span style="color:#64748b">// { id, trackingCode: "TK-J8K2M1", trackingUrl, status: "PENDING", eta }</span>

<span style="color:#64748b">// Send tracking link to customer</span>
<span style="color:#fbbf24">sendSMS</span>(customer.phone, \`Track your order: \${delivery.trackingUrl}\`)`} />

            <h3 style={h3}>Step 2: Assign a driver</h3>
            <CodeBlock label="typescript" code={`<span style="color:#c084fc">await</span> <span style="color:#38bdf8">fetch</span>(<span style="color:#86efac">\`${API_BASE}/v1/deliveries/\${delivery.id}/assign\`</span>, {
  method: <span style="color:#86efac">'POST'</span>,
  headers: {
    <span style="color:#86efac">'Authorization'</span>: <span style="color:#86efac">'Bearer tk_test_your_key'</span>,
    <span style="color:#86efac">'Content-Type'</span>: <span style="color:#86efac">'application/json'</span>
  },
  body: JSON.<span style="color:#fbbf24">stringify</span>({ driverId: <span style="color:#86efac">'driver_456'</span> })
})`} />

            <h3 style={h3}>Step 3: Stream driver location</h3>
            <p style={p}>Call this from the driver app every 5-10 seconds:</p>
            <CodeBlock label="typescript — driver app" code={`navigator.geolocation.<span style="color:#fbbf24">watchPosition</span>(<span style="color:#c084fc">async</span> (pos) => {
  <span style="color:#c084fc">await</span> <span style="color:#38bdf8">fetch</span>(<span style="color:#86efac">\`${API_BASE}/v1/deliveries/\${deliveryId}/location\`</span>, {
    method: <span style="color:#86efac">'POST'</span>,
    headers: {
      <span style="color:#86efac">'Authorization'</span>: <span style="color:#86efac">'Bearer tk_test_your_key'</span>,
      <span style="color:#86efac">'Content-Type'</span>: <span style="color:#86efac">'application/json'</span>
    },
    body: JSON.<span style="color:#fbbf24">stringify</span>({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      speed: pos.coords.speed,
      heading: pos.coords.heading
    })
  })
}, <span style="color:#c084fc">null</span>, { enableHighAccuracy: <span style="color:#c084fc">true</span> })`} />

            <h3 style={h3}>Step 4: Customer sees live tracking</h3>
            <p style={p}>The customer clicks the tracking URL and sees a real-time map with driver location, ETA countdown, status updates, and your branding. No code needed on the customer side.</p>

            <h3 style={h3}>Step 5: Receive webhooks</h3>
            <CodeBlock label="typescript" code={`<span style="color:#c084fc">await</span> <span style="color:#38bdf8">fetch</span>(<span style="color:#86efac">'${API_BASE}/v1/webhooks'</span>, {
  method: <span style="color:#86efac">'POST'</span>,
  headers: {
    <span style="color:#86efac">'Authorization'</span>: <span style="color:#86efac">'Bearer tk_test_your_key'</span>,
    <span style="color:#86efac">'Content-Type'</span>: <span style="color:#86efac">'application/json'</span>
  },
  body: JSON.<span style="color:#fbbf24">stringify</span>({
    url: <span style="color:#86efac">'https://yourapp.com/webhooks/trackkit'</span>,
    events: [<span style="color:#86efac">'delivery.status_changed'</span>, <span style="color:#86efac">'delivery.driver_assigned'</span>]
  })
})`} />
          </section>

          <section id="deliveries">
            <h2 style={h2}>Deliveries API</h2>
            <p style={p}>Full CRUD for deliveries with automatic geocoding, routing, and ETA calculation.</p>
            <Endpoint method="POST" path="/v1/deliveries" desc="Create delivery" />
            <Endpoint method="GET" path="/v1/deliveries" desc="List deliveries" />
            <Endpoint method="GET" path="/v1/deliveries/:id" desc="Get delivery" />
            <Endpoint method="PATCH" path="/v1/deliveries/:id/status" desc="Update status" />
            <Endpoint method="POST" path="/v1/deliveries/:id/location" desc="Update driver location" />
            <Endpoint method="POST" path="/v1/deliveries/:id/assign" desc="Assign driver" />
            <h3 style={h3}>Create Delivery — Request Body</h3>
            <CodeBlock label="json" code={`{
  <span style="color:#38bdf8">"pickup"</span>:     { <span style="color:#38bdf8">"address"</span>: <span style="color:#86efac">"Yaba Tech, Lagos, Nigeria"</span> },
  <span style="color:#38bdf8">"dropoff"</span>:    { <span style="color:#38bdf8">"address"</span>: <span style="color:#86efac">"Victoria Island, Lagos, Nigeria"</span> },
  <span style="color:#38bdf8">"externalId"</span>: <span style="color:#86efac">"ORDER-123"</span>,        <span style="color:#64748b">// optional: your own order ID</span>
  <span style="color:#38bdf8">"driverId"</span>:   <span style="color:#86efac">"driver_456"</span>,      <span style="color:#64748b">// optional: assign immediately</span>
  <span style="color:#38bdf8">"metadata"</span>:   { <span style="color:#86efac">"any"</span>: <span style="color:#86efac">"data"</span> }  <span style="color:#64748b">// optional: arbitrary JSON</span>
}`} />
            <div style={note}>
              You can pass <code style={{ color: "#38bdf8" }}>lat</code>/<code style={{ color: "#38bdf8" }}>lng</code> instead of <code style={{ color: "#38bdf8" }}>address</code> for pickup/dropoff. If only an address is provided, it&apos;s geocoded automatically via Nominatim. Append &quot;Nigeria&quot; for best results with Lagos addresses.
            </div>
            <h3 style={h3}>Status Transitions</h3>
            <CodeBlock label="valid statuses" code={`CONFIRMED · DRIVER_ASSIGNED · PICKUP_EN_ROUTE · PICKED_UP · DELIVERING · ARRIVING · DELIVERED · CANCELLED`} />
          </section>

          <section id="drivers">
            <h2 style={h2}>Drivers API</h2>
            <p style={p}>Manage your driver fleet. Track online status and location.</p>
            <Endpoint method="POST" path="/v1/drivers" desc="Create driver" />
            <Endpoint method="GET" path="/v1/drivers" desc="List drivers" />
            <Endpoint method="GET" path="/v1/drivers/:id" desc="Get driver" />
            <Endpoint method="POST" path="/v1/drivers/:id/location" desc="Update location" />
            <Endpoint method="PATCH" path="/v1/drivers/:id/status" desc="Set online/offline" />
            <h3 style={h3}>Create Driver</h3>
            <CodeBlock label="json" code={`{
  <span style="color:#38bdf8">"name"</span>:       <span style="color:#86efac">"Emeka Obi"</span>,
  <span style="color:#38bdf8">"phone"</span>:      <span style="color:#86efac">"+2348012345678"</span>,   <span style="color:#64748b">// optional</span>
  <span style="color:#38bdf8">"externalId"</span>: <span style="color:#86efac">"DRV-100"</span>            <span style="color:#64748b">// optional: your own driver ID</span>
}`} />
          </section>

          <section id="webhooks">
            <h2 style={h2}>Webhooks</h2>
            <p style={p}>Get notified when delivery events happen. All payloads are signed with HMAC-SHA256.</p>
            <Endpoint method="POST" path="/v1/webhooks" desc="Register webhook" />
            <Endpoint method="GET" path="/v1/webhooks" desc="List webhooks" />
            <Endpoint method="DELETE" path="/v1/webhooks/:id" desc="Delete webhook" />
            <h3 style={h3}>Webhook Payload</h3>
            <CodeBlock label="json" code={`{
  <span style="color:#38bdf8">"event"</span>: <span style="color:#86efac">"delivery.status_changed"</span>,
  <span style="color:#38bdf8">"data"</span>: {
    <span style="color:#38bdf8">"id"</span>: <span style="color:#86efac">"clx7abc123"</span>,
    <span style="color:#38bdf8">"trackingCode"</span>: <span style="color:#86efac">"TK-J8K2M1"</span>,
    <span style="color:#38bdf8">"status"</span>: <span style="color:#86efac">"DELIVERED"</span>,
    <span style="color:#38bdf8">"previousStatus"</span>: <span style="color:#86efac">"ARRIVING"</span>
  },
  <span style="color:#38bdf8">"timestamp"</span>: <span style="color:#86efac">"2026-03-20T14:30:00Z"</span>,
  <span style="color:#38bdf8">"id"</span>: <span style="color:#86efac">"wh_1710940200_abc123"</span>
}`} />
            <h3 style={h3}>Verify Signature</h3>
            <p style={p}>Every webhook includes an <code style={{ color: "#38bdf8" }}>x-trackkit-signature</code> header:</p>
            <CodeBlock label="typescript" code={`<span style="color:#c084fc">const</span> signature = request.headers[<span style="color:#86efac">'x-trackkit-signature'</span>]
<span style="color:#c084fc">const</span> expected = crypto
  .<span style="color:#fbbf24">createHmac</span>(<span style="color:#86efac">'sha256'</span>, webhookSecret)
  .<span style="color:#fbbf24">update</span>(JSON.<span style="color:#fbbf24">stringify</span>(request.body))
  .<span style="color:#fbbf24">digest</span>(<span style="color:#86efac">'hex'</span>)

<span style="color:#c084fc">if</span> (<span style="color:#86efac">\`sha256=\${expected}\`</span> !== signature) {
  <span style="color:#c084fc">return</span> res.<span style="color:#fbbf24">status</span>(<span style="color:#fbbf24">401</span>).<span style="color:#fbbf24">send</span>(<span style="color:#86efac">'Invalid signature'</span>)
}`} />
            <Table
              headers={["EVENT", "FIRED WHEN"]}
              rows={[
                ["delivery.created", "New delivery created"],
                ["delivery.status_changed", "Status transitions"],
                ["delivery.driver_assigned", "Driver assigned to delivery"],
                ["delivery.location_updated", "Driver location update received"],
              ]}
            />
          </section>

          <section id="tracking">
            <h2 style={h2}>Live Tracking</h2>
            <p style={p}>Customers can track deliveries in real-time via WebSocket or the tracking URL.</p>
            <h3 style={h3}>Tracking URL</h3>
            <p style={p}>Every delivery returns a <code style={{ color: "#38bdf8" }}>trackingUrl</code>. Share it with your customer via SMS, WhatsApp, or email. They see a live map with driver location, ETA, and status — branded with your logo and colors.</p>
            <h3 style={h3}>WebSocket</h3>
            <p style={p}>Connect to the WebSocket endpoint for real-time updates in your own UI:</p>
            <CodeBlock label="javascript" code={`<span style="color:#c084fc">const</span> ws = <span style="color:#c084fc">new</span> <span style="color:#38bdf8">WebSocket</span>(<span style="color:#86efac">'wss://trackkitapi-production.up.railway.app/ws/track/TK-J8K2M1'</span>)

ws.<span style="color:#fbbf24">onmessage</span> = (event) => {
  <span style="color:#c084fc">const</span> msg = JSON.<span style="color:#fbbf24">parse</span>(event.data)

  <span style="color:#c084fc">if</span> (msg.type === <span style="color:#86efac">'location'</span>) {
    <span style="color:#64748b">// { lat, lng, heading, speed, eta, distance }</span>
    updateMap(msg.data)
  }
  <span style="color:#c084fc">if</span> (msg.type === <span style="color:#86efac">'status'</span>) {
    <span style="color:#64748b">// { status: "DELIVERING", eta: 8 }</span>
    updateStatus(msg.data)
  }
}`} />
          </section>

          <section id="status-flow">
            <h2 style={h2}>Status Flow</h2>
            <div style={{
              padding: "24px", borderRadius: 12,
              background: "rgba(12, 18, 34, 0.5)",
              border: "1px solid rgba(56, 189, 248, 0.08)",
              margin: "16px 0",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, lineHeight: 2.2, color: "#94a3b8",
              overflowX: "auto",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "PICKUP_EN_ROUTE", "PICKED_UP", "DELIVERING", "ARRIVING", "DELIVERED"].map((s, i) => (
                  <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 6,
                      background: s === "DELIVERED" ? "rgba(34, 197, 94, 0.12)" : "rgba(56, 189, 248, 0.08)",
                      color: s === "DELIVERED" ? "#22c55e" : "#38bdf8",
                      fontSize: 11, fontWeight: 700,
                    }}>{s}</span>
                    {i < 7 && <span style={{ color: "rgba(56, 189, 248, 0.3)" }}>→</span>}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148, 163, 184, 0.35)" }}>
                Any status can also transition to <span style={{ color: "rgba(239, 68, 68, 0.6)", padding: "2px 8px", borderRadius: 4, background: "rgba(239, 68, 68, 0.08)" }}>CANCELLED</span>
              </div>
            </div>
          </section>

          <section id="rate-limits">
            <h2 style={h2}>Rate Limits</h2>
            <p style={p}>Rate limits are enforced per tenant (API key), not per IP address.</p>
            <Table
              headers={["PLAN", "DELIVERIES/MO", "API CALLS/MIN", "WEBHOOKS"]}
              rows={[
                ["Free", "500", "100", "1"],
                ["Growth ($49/mo)", "5,000", "500", "5"],
                ["Scale ($199/mo)", "50,000", "2,000", "20"],
                ["Managed (custom)", "Unlimited", "10,000", "100"],
              ]}
            />
            <div style={note}>
              When you exceed the delivery limit, the API returns <code style={{ color: "#ef4444" }}>429 limit_exceeded</code>. Delivery counts reset automatically on the 1st of each month.
            </div>
          </section>

          <section id="sdk">
            <h2 style={h2}>JavaScript / TypeScript SDK</h2>
            <p style={p}>The official SDK wraps the REST API and WebSocket for easy integration.</p>
            <CodeBlock label="bash" code={`npm install trackkit-sdk`} />
            <CodeBlock label="typescript" code={`<span style="color:#c084fc">import</span> TrackKit <span style="color:#c084fc">from</span> <span style="color:#86efac">'trackkit-sdk'</span>

<span style="color:#c084fc">const</span> tk = <span style="color:#c084fc">new</span> <span style="color:#38bdf8">TrackKit</span>({ apiKey: <span style="color:#86efac">'tk_live_your_key'</span> })

<span style="color:#64748b">// Create a delivery</span>
<span style="color:#c084fc">const</span> delivery = <span style="color:#c084fc">await</span> tk.deliveries.<span style="color:#fbbf24">create</span>({
  pickup:  { address: <span style="color:#86efac">'Yaba Tech, Lagos, Nigeria'</span> },
  dropoff: { address: <span style="color:#86efac">'Victoria Island, Lagos, Nigeria'</span> },
  metadata: { orderId: <span style="color:#86efac">'ORD-123'</span> }
})

<span style="color:#64748b">// Update driver location</span>
<span style="color:#c084fc">await</span> tk.deliveries.<span style="color:#fbbf24">updateLocation</span>(delivery.id, {
  lat: <span style="color:#fbbf24">6.4738</span>, lng: <span style="color:#fbbf24">3.3952</span>, speed: <span style="color:#fbbf24">35</span>
})

<span style="color:#64748b">// Real-time tracking</span>
<span style="color:#c084fc">const</span> unsub = tk.realtime.<span style="color:#fbbf24">subscribe</span>(delivery.trackingCode, {
  <span style="color:#fbbf24">onLocation</span>: (data) => console.<span style="color:#fbbf24">log</span>(<span style="color:#86efac">'Driver at:'</span>, data.lat, data.lng),
  <span style="color:#fbbf24">onStatus</span>:   (data) => console.<span style="color:#fbbf24">log</span>(<span style="color:#86efac">'Status:'</span>, data.status),
})`} />
            <div style={note}>
              Published on npm as <a href="https://www.npmjs.com/package/trackkit-sdk" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8" }}>trackkit-sdk</a>. Supports both CommonJS and ESM. Full TypeScript types included.
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
