"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setApiKey } from "@/lib/api";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
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
        setApiKey(data.keys.test.key);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = (key: string, label: string) => {
    navigator.clipboard.writeText(key);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#060a14", color: "#f0f9ff",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: "linear-gradient(145deg, #0c1222, #0a0f1a)",
        border: "1px solid rgba(56, 189, 248, 0.15)",
        borderRadius: 20,
        padding: "36px 32px",
        boxShadow: "0 0 80px rgba(56, 189, 248, 0.08), 0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {!result ? (
          <>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, textDecoration: "none", color: "inherit" }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 900, color: "#060a14",
              }}>T</div>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>TrackKit</span>
            </Link>
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
                  color: "#f0f9ff", fontSize: 14, outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              {error && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px",
                borderRadius: 10, border: "none",
                background: loading ? "rgba(56, 189, 248, 0.3)" : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                color: "#060a14", fontSize: 14, fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                marginTop: 16, transition: "all 0.2s ease",
              }}>
                {loading ? "Creating..." : "Create Free Account"}
              </button>
            </form>
            <p style={{ fontSize: 12, color: "rgba(148, 163, 184, 0.3)", textAlign: "center", marginTop: 20 }}>
              Already have a key?{" "}
              <Link href="/login" style={{ color: "rgba(56, 189, 248, 0.6)" }}>Sign in</Link>
            </p>
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
                borderRadius: 10, padding: "12px 14px", marginBottom: 10,
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
                  }}>{item.key}</code>
                  <button onClick={() => copyKey(item.key, item.label)} style={{
                    padding: "6px 12px", borderRadius: 6,
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    background: copied === item.label ? "rgba(34, 197, 94, 0.15)" : "transparent",
                    color: copied === item.label ? "#22c55e" : "#38bdf8",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    whiteSpace: "nowrap", transition: "all 0.2s ease",
                  }}>
                    {copied === item.label ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            ))}

            <button onClick={() => router.push("/dashboard")} style={{
              display: "block", width: "100%", padding: "14px",
              borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              color: "#060a14", fontSize: 14, fontWeight: 700,
              cursor: "pointer", marginTop: 16, textAlign: "center",
              boxSizing: "border-box",
            }}>
              Open Dashboard →
            </button>
            <Link href="/docs" style={{
              display: "block", width: "100%", padding: "12px",
              borderRadius: 10,
              border: "1px solid rgba(56, 189, 248, 0.2)",
              background: "transparent",
              color: "#38bdf8", fontSize: 13, fontWeight: 600,
              cursor: "pointer", marginTop: 8,
              textDecoration: "none", textAlign: "center",
              boxSizing: "border-box",
            }}>
              Read the Docs
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
