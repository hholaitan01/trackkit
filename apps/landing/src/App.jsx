import { useState, useEffect, useRef, useCallback } from "react";
import DocsPage from "./Docs";

// ─── Route Path (Lagos: Yaba → Victoria Island) ───
const ROUTE_POINTS = [
  { lat: 6.5095, lng: 3.3711 },
  { lat: 6.5055, lng: 3.3735 },
  { lat: 6.4985, lng: 3.3782 },
  { lat: 6.4921, lng: 3.3810 },
  { lat: 6.4862, lng: 3.3855 },
  { lat: 6.4795, lng: 3.3901 },
  { lat: 6.4738, lng: 3.3952 },
  { lat: 6.4680, lng: 3.3988 },
  { lat: 6.4615, lng: 3.4035 },
  { lat: 6.4558, lng: 3.4082 },
  { lat: 6.4510, lng: 3.4110 },
  { lat: 6.4462, lng: 3.4145 },
  { lat: 6.4420, lng: 3.4178 },
  { lat: 6.4385, lng: 3.4210 },
  { lat: 6.4348, lng: 3.4255 },
  { lat: 6.4312, lng: 3.4298 },
  { lat: 6.4280, lng: 3.4350 },
];

const STATUS_FLOW = [
  { status: "confirmed", label: "Order Confirmed", icon: "✓", color: "#22c55e" },
  { status: "pickup", label: "Driver En Route to Pickup", icon: "◎", color: "#3b82f6" },
  { status: "picked_up", label: "Order Picked Up", icon: "◉", color: "#8b5cf6" },
  { status: "delivering", label: "On the Way", icon: "→", color: "#f59e0b" },
  { status: "arriving", label: "Almost There!", icon: "◈", color: "#ef4444" },
  { status: "delivered", label: "Delivered!", icon: "★", color: "#22c55e" },
];

// ─── Interpolate between two points ───
function lerp(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

// ─── Tracking Widget Component ───
function TrackingWidget({ isPlaying }) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTime = useRef(null);
  const DURATION = 18000;

  const getDriverPos = useCallback((p) => {
    const totalSegs = ROUTE_POINTS.length - 1;
    const seg = Math.min(Math.floor(p * totalSegs), totalSegs - 1);
    const t = (p * totalSegs) - seg;
    return lerp(ROUTE_POINTS[seg], ROUTE_POINTS[Math.min(seg + 1, totalSegs)], t);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      startTime.current = null;
      return;
    }

    const animate = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const p = Math.min(elapsed / DURATION, 1);
      setProgress(p);

      if (p < 0.08) setStatusIdx(0);
      else if (p < 0.2) setStatusIdx(1);
      else if (p < 0.3) setStatusIdx(2);
      else if (p < 0.75) setStatusIdx(3);
      else if (p < 0.92) setStatusIdx(4);
      else setStatusIdx(5);

      if (p < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          startTime.current = null;
          setProgress(0);
          setStatusIdx(0);
          if (isPlaying) animRef.current = requestAnimationFrame(animate);
        }, 2500);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  // Canvas map rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = W / 2, h = H / 2;

    const minLat = 6.425, maxLat = 6.515, minLng = 3.365, maxLng = 3.44;
    const toX = (lng) => ((lng - minLng) / (maxLng - minLng)) * w;
    const toY = (lat) => h - ((lat - minLat) / (maxLat - minLat)) * h;

    // Background
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.04)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath(); ctx.moveTo(i * w / 20, 0); ctx.lineTo(i * w / 20, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * h / 20); ctx.lineTo(w, i * h / 20); ctx.stroke();
    }

    // Fake streets
    ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
    ctx.lineWidth = 1;
    const streets = [
      [{ lat: 6.51, lng: 3.37 }, { lat: 6.43, lng: 3.43 }],
      [{ lat: 6.50, lng: 3.365 }, { lat: 6.45, lng: 3.44 }],
      [{ lat: 6.515, lng: 3.39 }, { lat: 6.425, lng: 3.39 }],
      [{ lat: 6.515, lng: 3.41 }, { lat: 6.425, lng: 3.41 }],
      [{ lat: 6.48, lng: 3.365 }, { lat: 6.48, lng: 3.44 }],
      [{ lat: 6.46, lng: 3.365 }, { lat: 6.46, lng: 3.44 }],
      [{ lat: 6.44, lng: 3.365 }, { lat: 6.44, lng: 3.44 }],
    ];
    streets.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(toX(a.lng), toY(a.lat));
      ctx.lineTo(toX(b.lng), toY(b.lat));
      ctx.stroke();
    });

    // Full route (dim)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ROUTE_POINTS.forEach((p, i) => {
      i === 0 ? ctx.moveTo(toX(p.lng), toY(p.lat)) : ctx.lineTo(toX(p.lng), toY(p.lat));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Traveled route
    const driverPos = getDriverPos(progress);
    const driverIdx = Math.floor(progress * (ROUTE_POINTS.length - 1));
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= driverIdx && i < ROUTE_POINTS.length; i++) {
      const p = ROUTE_POINTS[i];
      i === 0 ? ctx.moveTo(toX(p.lng), toY(p.lat)) : ctx.lineTo(toX(p.lng), toY(p.lat));
    }
    ctx.lineTo(toX(driverPos.lng), toY(driverPos.lat));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Origin marker
    const ox = toX(ROUTE_POINTS[0].lng), oy = toY(ROUTE_POINTS[0].lat);
    ctx.fillStyle = "#22c55e";
    ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0f1a";
    ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2); ctx.fill();

    // Destination marker
    const dx = toX(ROUTE_POINTS[ROUTE_POINTS.length - 1].lng);
    const dy = toY(ROUTE_POINTS[ROUTE_POINTS.length - 1].lat);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0f1a";
    ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();

    // Driver dot
    const px = toX(driverPos.lng), py = toY(driverPos.lat);
    // Pulse
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    ctx.fillStyle = `rgba(56, 189, 248, ${0.15 + pulse * 0.1})`;
    ctx.beginPath(); ctx.arc(px, py, 14 + pulse * 4, 0, Math.PI * 2); ctx.fill();
    // Core
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();

    // Labels
    ctx.font = "600 9px 'DM Sans', sans-serif";
    ctx.fillStyle = "rgba(56, 189, 248, 0.6)";
    ctx.fillText("PICKUP", ox + 10, oy - 8);
    ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
    ctx.fillText("DROP-OFF", dx + 10, dy - 8);
  }, [progress, getDriverPos]);

  const eta = Math.max(0, Math.ceil((1 - progress) * 14));
  const dist = (progress * 8.2).toFixed(1);
  const currentStatus = STATUS_FLOW[statusIdx];

  return (
    <div style={{
      width: "100%",
      maxWidth: 400,
      background: "linear-gradient(145deg, #0c1222 0%, #0a0f1a 100%)",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(56, 189, 248, 0.12)",
      boxShadow: "0 0 60px rgba(56, 189, 248, 0.08), 0 25px 50px rgba(0,0,0,0.4)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#0a0f1a",
          }}>T</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f9ff", letterSpacing: "-0.01em" }}>
              Order #TK-2847
            </div>
            <div style={{ fontSize: 10, color: "rgba(56, 189, 248, 0.5)", fontWeight: 500, marginTop: 1 }}>
              Yaba → Victoria Island
            </div>
          </div>
        </div>
        <div style={{
          padding: "4px 10px",
          borderRadius: 20,
          background: `${currentStatus.color}18`,
          border: `1px solid ${currentStatus.color}30`,
          fontSize: 10,
          fontWeight: 600,
          color: currentStatus.color,
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: "all 0.5s ease",
        }}>
          <span>{currentStatus.icon}</span>
          {currentStatus.label}
        </div>
      </div>

      {/* Map Canvas */}
      <div style={{ position: "relative", width: "100%", height: 220 }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        {!isPlaying && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(10, 15, 26, 0.6)",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              fontSize: 11, color: "rgba(56, 189, 248, 0.6)",
              fontWeight: 600, letterSpacing: "0.05em",
            }}>
              AWAITING DRIVER
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
        padding: "14px 0",
        borderTop: "1px solid rgba(56, 189, 248, 0.08)",
        borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
      }}>
        {[
          { label: "ETA", value: `${eta} min`, accent: true },
          null,
          { label: "DISTANCE", value: `${dist} km` },
          null,
          { label: "SPEED", value: `${isPlaying && progress < 1 ? "32" : "0"} km/h` },
        ].map((item, i) =>
          item === null ? (
            <div key={i} style={{ background: "rgba(56, 189, 248, 0.08)" }} />
          ) : (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em",
                color: item.accent ? "#38bdf8" : "#f0f9ff",
                fontVariantNumeric: "tabular-nums",
              }}>
                {item.value}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 600, color: "rgba(148, 163, 184, 0.5)",
                letterSpacing: "0.08em", marginTop: 2,
              }}>
                {item.label}
              </div>
            </div>
          )
        )}
      </div>

      {/* Progress bar */}
      <div style={{ padding: "12px 20px 16px" }}>
        <div style={{
          height: 3, borderRadius: 2,
          background: "rgba(56, 189, 248, 0.1)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #38bdf8, #0ea5e9)",
            borderRadius: 2,
            transition: "width 0.3s ease",
            boxShadow: "0 0 8px rgba(56, 189, 248, 0.4)",
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 8, fontSize: 10, color: "rgba(148, 163, 184, 0.4)",
          fontWeight: 500,
        }}>
          <span>Yaba Tech</span>
          <span>Victoria Island</span>
        </div>
      </div>
    </div>
  );
}

// ─── Code Block Component ───
function CodeBlock({ code, label }) {
  return (
    <div style={{
      background: "#0c1222",
      borderRadius: 12,
      border: "1px solid rgba(56, 189, 248, 0.1)",
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      {label && (
        <div style={{
          padding: "8px 16px",
          borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(56, 189, 248, 0.4)",
          letterSpacing: "0.05em",
        }}>
          {label}
        </div>
      )}
      <pre style={{
        padding: "16px",
        margin: 0,
        fontSize: 12,
        lineHeight: 1.7,
        color: "#94a3b8",
        overflowX: "auto",
      }}>
        <code dangerouslySetInnerHTML={{ __html: code }} />
      </pre>
    </div>
  );
}

// ─── Feature Card ───
function FeatureCard({ icon, title, desc, accent }) {
  return (
    <div style={{
      background: "rgba(12, 18, 34, 0.6)",
      border: "1px solid rgba(56, 189, 248, 0.08)",
      borderRadius: 16,
      padding: "28px 24px",
      transition: "all 0.3s ease",
      cursor: "default",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accent}40`;
        e.currentTarget.style.boxShadow = `0 0 30px ${accent}10`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.08)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${accent}15`,
        border: `1px solid ${accent}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, marginBottom: 16,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f9ff", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(148, 163, 184, 0.6)" }}>
        {desc}
      </div>
    </div>
  );
}

// ─── Pricing Card ───
function PricingCard({ tier, price, period, features, highlight, cta, onCta }) {
  return (
    <div style={{
      background: highlight ? "linear-gradient(145deg, rgba(56, 189, 248, 0.08), rgba(12, 18, 34, 0.8))" : "rgba(12, 18, 34, 0.5)",
      border: `1px solid ${highlight ? "rgba(56, 189, 248, 0.25)" : "rgba(56, 189, 248, 0.08)"}`,
      borderRadius: 16,
      padding: "32px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {highlight && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          padding: "3px 10px", borderRadius: 20,
          background: "rgba(56, 189, 248, 0.15)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          fontSize: 10, fontWeight: 700, color: "#38bdf8",
          letterSpacing: "0.03em",
        }}>POPULAR</div>
      )}
      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(148, 163, 184, 0.5)", letterSpacing: "0.03em", marginBottom: 8 }}>
        {tier}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: "#f0f9ff", letterSpacing: "-0.03em" }}>
          {price}
        </span>
        {period && <span style={{ fontSize: 13, color: "rgba(148, 163, 184, 0.4)" }}>{period}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(148, 163, 184, 0.7)" }}>
            <span style={{ color: "#38bdf8", fontSize: 10 }}>✦</span>
            {f}
          </div>
        ))}
      </div>
      <button onClick={onCta} style={{
        width: "100%", padding: "12px",
        borderRadius: 10,
        border: highlight ? "none" : "1px solid rgba(56, 189, 248, 0.2)",
        background: highlight ? "linear-gradient(135deg, #38bdf8, #0ea5e9)" : "transparent",
        color: highlight ? "#0a0f1a" : "#38bdf8",
        fontSize: 13, fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}>
        {cta}
      </button>
    </div>
  );
}

// ─── Signup Modal ───
function SignupModal({ isOpen, onClose, onSignupComplete }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  if (!isOpen) return null;

  const handleSignup = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://trackkitapi-production.up.railway.app/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.message || "Signup failed");
      } else {
        setResult(data);
        onSignupComplete?.(data.keys.test.key);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = (key, label) => {
    navigator.clipboard.writeText(key);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleClose = () => {
    setName("");
    setResult(null);
    setError("");
    onClose();
  };

  return (
    <div onClick={handleClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 440,
        background: "linear-gradient(145deg, #0c1222, #0a0f1a)",
        border: "1px solid rgba(56, 189, 248, 0.15)",
        borderRadius: 20,
        padding: "36px 32px",
        boxShadow: "0 0 80px rgba(56, 189, 248, 0.08), 0 25px 50px rgba(0,0,0,0.5)",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {!result ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f0f9ff", marginBottom: 6 }}>
              Get your API keys
            </div>
            <div style={{ fontSize: 13, color: "rgba(148, 163, 184, 0.5)", marginBottom: 28 }}>
              Create an account in seconds. No credit card required.
            </div>
            <form onSubmit={handleSignup}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(148, 163, 184, 0.5)", marginBottom: 8, display: "block" }}>
                Company / App Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chowdeck, FastRider"
                autoFocus
                style={{
                  width: "100%", padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(56, 189, 248, 0.15)",
                  background: "rgba(6, 10, 20, 0.8)",
                  color: "#f0f9ff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              {error && (
                <div style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</div>
              )}
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px",
                borderRadius: 10, border: "none",
                background: loading ? "rgba(56, 189, 248, 0.3)" : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                color: "#060a14", fontSize: 14, fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                marginTop: 16,
                transition: "all 0.2s ease",
              }}>
                {loading ? "Creating..." : "Create Free Account"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, marginBottom: 16,
            }}>
              ✓
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f0f9ff", marginBottom: 4 }}>
              Welcome, {result.tenant.name}!
            </div>
            <div style={{ fontSize: 13, color: "rgba(148, 163, 184, 0.5)", marginBottom: 24 }}>
              Save your API keys below — they won't be shown again.
            </div>

            {[
              { label: "Test Key", key: result.keys.test.key, desc: "For development & testing" },
              { label: "Live Key", key: result.keys.live.key, desc: "For production" },
            ].map((item) => (
              <div key={item.label} style={{
                background: "rgba(6, 10, 20, 0.8)",
                border: "1px solid rgba(56, 189, 248, 0.1)",
                borderRadius: 10, padding: "12px 14px",
                marginBottom: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(148, 163, 184, 0.5)", letterSpacing: "0.03em" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(148, 163, 184, 0.3)" }}>{item.desc}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{
                    flex: 1, fontSize: 12, color: "#38bdf8",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    wordBreak: "break-all",
                  }}>
                    {item.key}
                  </code>
                  <button onClick={() => copyKey(item.key, item.label)} style={{
                    padding: "6px 12px", borderRadius: 6,
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    background: copied === item.label ? "rgba(34, 197, 94, 0.15)" : "transparent",
                    color: copied === item.label ? "#22c55e" : "#38bdf8",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}>
                    {copied === item.label ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            ))}

            <a
              href={`https://dashboard-nu-teal-99.vercel.app?key=${encodeURIComponent(result.keys.test.key)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", width: "100%", padding: "14px",
                borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                color: "#060a14", fontSize: 14, fontWeight: 700,
                cursor: "pointer", marginTop: 16,
                textDecoration: "none", textAlign: "center",
                boxSizing: "border-box",
              }}
            >
              Open Dashboard →
            </a>
            <a
              href="/docs"
              onClick={(e) => { e.preventDefault(); handleClose(); }}
              style={{
                display: "block", width: "100%", padding: "12px",
                borderRadius: 10,
                border: "1px solid rgba(56, 189, 248, 0.2)",
                background: "transparent",
                color: "#38bdf8", fontSize: 13, fontWeight: 600,
                cursor: "pointer", marginTop: 8,
                textDecoration: "none", textAlign: "center",
                boxSizing: "border-box",
              }}
            >
              Read the Docs
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function TrackKitLanding() {
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("widget");
  const [showSignup, setShowSignup] = useState(false);
  const [page, setPage] = useState(window.location.pathname === "/docs" ? "docs" : "home");
  const [loggedInKey, setLoggedInKey] = useState(() => localStorage.getItem("tk_api_key") || "");

  const dashboardUrl = loggedInKey
    ? `https://dashboard-nu-teal-99.vercel.app?key=${encodeURIComponent(loggedInKey)}`
    : "https://dashboard-nu-teal-99.vercel.app";

  const handleSignupComplete = (apiKey) => {
    localStorage.setItem("tk_api_key", apiKey);
    setLoggedInKey(apiKey);
  };

  const navigate = (p) => {
    setPage(p);
    window.history.pushState({}, "", p === "docs" ? "/docs" : "/");
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onPop = () => setPage(window.location.pathname === "/docs" ? "docs" : "home");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDemoPlaying(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (page === "docs") return <DocsPage onNavigate={(p) => { setPage(p); window.history.pushState({}, "", "/"); window.scrollTo(0, 0); }} />;

  const widgetCode = `<span style="color:#c084fc">&lt;script</span> <span style="color:#38bdf8">src</span>=<span style="color:#86efac">"https://cdn.trackkit.dev/v1/widget.js"</span><span style="color:#c084fc">&gt;&lt;/script&gt;</span>

<span style="color:#c084fc">&lt;div</span> <span style="color:#38bdf8">id</span>=<span style="color:#86efac">"trackkit"</span>
  <span style="color:#38bdf8">data-key</span>=<span style="color:#86efac">"tk_live_abc123"</span>
  <span style="color:#38bdf8">data-delivery</span>=<span style="color:#86efac">"del_2847"</span>
<span style="color:#c084fc">/&gt;</span>

<span style="color:#64748b">// That's it. 3 lines. Live tracking.</span>`;

  const apiCode = `<span style="color:#64748b">// Create a delivery</span>
<span style="color:#c084fc">const</span> delivery = <span style="color:#c084fc">await</span> trackkit.<span style="color:#38bdf8">deliveries</span>.<span style="color:#fbbf24">create</span>({
  pickup: { address: <span style="color:#86efac">"Yaba Tech, Lagos"</span> },
  dropoff: { address: <span style="color:#86efac">"Victoria Island"</span> },
  metadata: { orderId: <span style="color:#86efac">"ORD-2847"</span> }
})

<span style="color:#64748b">// Returns tracking URL instantly</span>
console.<span style="color:#fbbf24">log</span>(delivery.trackingUrl)
<span style="color:#64748b">// → https://track.yourapp.com/del_2847</span>

<span style="color:#64748b">// Update driver location (from driver app)</span>
<span style="color:#c084fc">await</span> trackkit.<span style="color:#38bdf8">deliveries</span>.<span style="color:#fbbf24">updateLocation</span>(
  delivery.id,
  { lat: <span style="color:#fbbf24">6.4738</span>, lng: <span style="color:#fbbf24">3.3952</span> }
)`;

  const webhookCode = `<span style="color:#64748b">// Webhook events → your backend</span>
{
  <span style="color:#38bdf8">"event"</span>: <span style="color:#86efac">"delivery.status_changed"</span>,
  <span style="color:#38bdf8">"data"</span>: {
    <span style="color:#38bdf8">"id"</span>: <span style="color:#86efac">"del_2847"</span>,
    <span style="color:#38bdf8">"status"</span>: <span style="color:#86efac">"arriving"</span>,
    <span style="color:#38bdf8">"eta_minutes"</span>: <span style="color:#fbbf24">3</span>,
    <span style="color:#38bdf8">"driver"</span>: {
      <span style="color:#38bdf8">"lat"</span>: <span style="color:#fbbf24">6.4385</span>,
      <span style="color:#38bdf8">"lng"</span>: <span style="color:#fbbf24">3.4210</span>
    }
  }
}

<span style="color:#64748b">// Trigger SMS, push, WhatsApp — your logic</span>`;

  const tabs = [
    { id: "widget", label: "Embed Widget" },
    { id: "api", label: "REST API" },
    { id: "webhooks", label: "Webhooks" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060a14",
      color: "#f0f9ff",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      overflowX: "hidden",
    }}>


      {/* BG effects */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56, 189, 248, 0.06), transparent 70%)",
      }} />

      {/* Nav */}
      <nav style={{
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(56, 189, 248, 0.06)",
        position: "sticky",
        top: 0,
        background: "rgba(6, 10, 20, 0.8)",
        backdropFilter: "blur(20px)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#060a14",
          }}>T</div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>
            TrackKit
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {[
            { label: "Features", href: "#features" },
            { label: "Pricing", href: "#pricing" },
            { label: "Docs", href: "/docs", internal: true },
          ].map(l => (
            <a key={l.label} href={l.href} onClick={l.internal ? (e) => { e.preventDefault(); setPage("docs"); window.history.pushState({}, "", "/docs"); window.scrollTo(0, 0); } : undefined} style={{
              fontSize: 13, color: "rgba(148, 163, 184, 0.6)", textDecoration: "none",
              fontWeight: 500, transition: "color 0.2s",
            }}
              onMouseEnter={e => e.target.style.color = "#f0f9ff"}
              onMouseLeave={e => e.target.style.color = "rgba(148, 163, 184, 0.6)"}
            >{l.label}</a>
          ))}
          <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" style={{
            padding: "8px 18px", borderRadius: 8,
            border: "1px solid rgba(56, 189, 248, 0.25)",
            background: loggedInKey ? "rgba(56, 189, 248, 0.1)" : "transparent",
            color: "#38bdf8",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            textDecoration: "none",
            marginRight: -8,
          }}>{loggedInKey ? "Dashboard" : "Login"}</a>
          <a href="https://github.com/hholaitan01/trackkit" target="_blank" rel="noopener noreferrer" style={{
            padding: "8px 18px", borderRadius: 8,
            background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
            border: "none", color: "#060a14",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            textDecoration: "none",
          }}>GitHub</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: "80px 24px 60px",
        maxWidth: 1100,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 60,
        alignItems: "center",
      }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 20,
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.12)",
            fontSize: 11, fontWeight: 600, color: "#38bdf8",
            marginBottom: 24,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            Open Source · MIT Licensed
          </div>

          <h1 style={{
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
            margin: "0 0 20px",
          }}>
            Real-time delivery tracking.{" "}
            <span style={{
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9, #38bdf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Zero Google Maps fees.
            </span>
          </h1>

          <p style={{
            fontSize: 17,
            lineHeight: 1.7,
            color: "rgba(148, 163, 184, 0.7)",
            margin: "0 0 36px",
            maxWidth: 480,
          }}>
            Drop-in tracking infrastructure for delivery and ride-sharing apps.
            Embeddable widget, REST API, real-time WebSockets.
            Built on OpenStreetMap. Pay 10× less than Google Maps.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => setShowSignup(true)} style={{
              padding: "14px 28px", borderRadius: 10,
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              border: "none", color: "#060a14",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 0 30px rgba(56, 189, 248, 0.2)",
            }}>
              Start Free →
            </button>
            <button onClick={() => { setPage("docs"); window.history.pushState({}, "", "/docs"); window.scrollTo(0, 0); }} style={{
              padding: "14px 28px", borderRadius: 10,
              background: "transparent",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              View Docs
            </button>
          </div>

          <div style={{
            display: "flex", gap: 32, marginTop: 40,
          }}>
            {[
              { n: "500", l: "Free deliveries/mo" },
              { n: "<50ms", l: "Location updates" },
              { n: "$0", l: "Maps API cost" },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8", letterSpacing: "-0.02em" }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "rgba(148, 163, 184, 0.4)", fontWeight: 500, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live tracking demo */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <TrackingWidget isPlaying={demoPlaying} />
        </div>
      </section>

      {/* Social proof bar */}
      <div style={{
        borderTop: "1px solid rgba(56, 189, 248, 0.06)",
        borderBottom: "1px solid rgba(56, 189, 248, 0.06)",
        padding: "20px 24px",
        textAlign: "center",
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(148, 163, 184, 0.3)", letterSpacing: "0.1em" }}>
          BUILT FOR AFRICAN STARTUPS · WORKS GLOBALLY · POWERED BY OPENSTREETMAP
        </span>
      </div>

      {/* How it works */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
            Three lines of code. Live tracking.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(148, 163, 184, 0.5)", margin: 0 }}>
            Integrate in minutes, not months. Embed a widget, call an API, or both.
          </p>
        </div>

        {/* Code tabs */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 16,
          background: "rgba(12, 18, 34, 0.5)",
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: activeTab === t.id ? "rgba(56, 189, 248, 0.12)" : "transparent",
                color: activeTab === t.id ? "#38bdf8" : "rgba(148, 163, 184, 0.5)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CodeBlock
          code={activeTab === "widget" ? widgetCode : activeTab === "api" ? apiCode : webhookCode}
          label={activeTab === "widget" ? "index.html" : activeTab === "api" ? "server.js" : "webhook_payload.json"}
        />
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "40px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
            Everything you need. Nothing you don't.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <FeatureCard icon="◎" accent="#38bdf8" title="Real-Time Tracking" desc="Sub-50ms WebSocket location streaming. Customers see the driver move in real-time on the map." />
          <FeatureCard icon="⟨⟩" accent="#c084fc" title="Embeddable Widget" desc="Drop-in JavaScript widget. Works in React, Vue, vanilla HTML. 3 lines to integrate." />
          <FeatureCard icon="⚡" accent="#fbbf24" title="REST + WebSocket API" desc="Create deliveries, update locations, get ETAs. Full programmatic control." />
          <FeatureCard icon="↗" accent="#22c55e" title="Auto ETA & Routing" desc="Live recalculating ETAs using Valhalla routing. No Google Maps bills." />
          <FeatureCard icon="◇" accent="#f472b6" title="Webhooks" desc="Status events pushed to your backend. Trigger SMS, push, WhatsApp on delivery milestones." />
          <FeatureCard icon="⊞" accent="#fb923c" title="Multi-Tenant" desc="One API, unlimited brands. White-label tracking pages per client with custom domains." />
        </div>
      </section>

      {/* Comparison */}
      <section style={{
        padding: "60px 24px",
        borderTop: "1px solid rgba(56, 189, 248, 0.06)",
        maxWidth: 800,
        margin: "0 auto",
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center", margin: "0 0 32px" }}>
          Google Maps vs TrackKit
        </h2>
        <div style={{
          background: "rgba(12, 18, 34, 0.5)",
          borderRadius: 16,
          border: "1px solid rgba(56, 189, 248, 0.08)",
          overflow: "hidden",
        }}>
          {[
            { label: "10K routes/day", google: "$2,100/mo", tk: "$199/mo" },
            { label: "Real-time tracking", google: "Build yourself", tk: "Built-in" },
            { label: "Customer widget", google: "Build yourself", tk: "3 lines of code" },
            { label: "Webhooks", google: "Build yourself", tk: "Built-in" },
            { label: "Setup time", google: "Weeks", tk: "Minutes" },
            { label: "Vendor lock-in", google: "Yes", tk: "Open source" },
          ].map((row, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              padding: "14px 24px",
              borderBottom: i < 5 ? "1px solid rgba(56, 189, 248, 0.06)" : "none",
              fontSize: 13,
            }}>
              <span style={{ fontWeight: 600, color: "rgba(148, 163, 184, 0.7)" }}>{row.label}</span>
              <span style={{ color: "rgba(239, 68, 68, 0.6)", textAlign: "center" }}>{row.google}</span>
              <span style={{ color: "#22c55e", fontWeight: 600, textAlign: "center" }}>{row.tk}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
            Simple, predictable pricing
          </h2>
          <p style={{ fontSize: 15, color: "rgba(148, 163, 184, 0.5)", margin: 0 }}>
            Start free. Scale when you're ready.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <PricingCard
            tier="Free"
            price="$0"
            features={["500 deliveries/mo", "Tracking widget", "REST API", "Community support"]}
            cta="Start Free"
            onCta={() => setShowSignup(true)}
          />
          <PricingCard
            tier="Growth"
            price="$49"
            period="/mo"
            features={["5,000 deliveries/mo", "Custom branding", "Webhooks", "Email support"]}
            cta="Get Started"
            onCta={() => setShowSignup(true)}
          />
          <PricingCard
            tier="Scale"
            price="$199"
            period="/mo"
            highlight
            features={["50,000 deliveries/mo", "Custom domain", "Priority support", "Analytics dashboard"]}
            cta="Get Started"
            onCta={() => setShowSignup(true)}
          />
          <PricingCard
            tier="Managed"
            price="Custom"
            features={["Unlimited deliveries", "Full setup by us", "n8n automations", "Dedicated support"]}
            cta="Contact Us"
            onCta={() => window.location.href = "mailto:hello@trackkit.dev?subject=TrackKit Managed Plan"}
          />
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "80px 24px",
        textAlign: "center",
        borderTop: "1px solid rgba(56, 189, 248, 0.06)",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
          Stop paying Google.{" "}
          <span style={{
            background: "linear-gradient(135deg, #38bdf8, #22c55e)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Start shipping.</span>
        </h2>
        <p style={{
          fontSize: 15, color: "rgba(148, 163, 184, 0.5)",
          margin: "0 0 32px",
        }}>
          500 free deliveries. No credit card required.
        </p>
        <button onClick={() => setShowSignup(true)} style={{
          padding: "16px 40px", borderRadius: 12,
          background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
          border: "none", color: "#060a14",
          fontSize: 16, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 0 40px rgba(56, 189, 248, 0.25)",
        }}>
          Get Your API Keys →
        </button>
      </section>

      <SignupModal isOpen={showSignup} onClose={() => setShowSignup(false)} onSignupComplete={handleSignupComplete} />

      {/* Footer */}
      <footer style={{
        padding: "32px 24px",
        borderTop: "1px solid rgba(56, 189, 248, 0.06)",
        textAlign: "center",
        fontSize: 12,
        color: "rgba(148, 163, 184, 0.3)",
      }}>
        © 2026 TrackKit. Open source tracking infrastructure.
      </footer>


    </div>
  );
}
