"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setApiKey, hasApiKey } from "@/lib/api";

export default function LoginPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Accept ?key= param for seamless auth from landing page
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get("key");
    if (urlKey && urlKey.startsWith("tk_")) {
      setApiKey(urlKey);
      // Clean the URL
      window.history.replaceState({}, "", "/");
      router.replace("/dashboard");
      return;
    }
    if (hasApiKey()) router.replace("/dashboard");
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed.startsWith("tk_")) {
      setError("API key must start with tk_test_ or tk_live_");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("https://trackkitapi-production.up.railway.app/v1/tenants/me", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (!res.ok) throw new Error("Invalid API key");
      setApiKey(trimmed);
      router.push("/dashboard");
    } catch {
      setError("Invalid API key. Check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-sky-500 flex items-center justify-center text-base font-black text-base">
            T
          </div>
          <span className="text-xl font-extrabold tracking-tight">TrackKit</span>
        </div>

        <div className="bg-surface rounded-2xl border border-white/5 p-8">
          <h1 className="text-lg font-bold mb-1">Sign in to Dashboard</h1>
          <p className="text-sm text-white/40 mb-6">Enter your API key to continue.</p>

          <form onSubmit={handleLogin}>
            <label className="block text-xs font-semibold text-white/40 mb-2">API Key</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="tk_test_..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-base border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/40 transition"
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-brand to-sky-500 text-sm font-bold text-base disabled:opacity-40 transition hover:opacity-90"
            >
              {loading ? "Verifying..." : "Continue"}
            </button>
          </form>

          <p className="text-xs text-white/25 text-center mt-6">
            Don't have a key?{" "}
            <a href="https://track-kit.vercel.app" target="_blank" className="text-brand/60 hover:text-brand">
              Sign up free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
