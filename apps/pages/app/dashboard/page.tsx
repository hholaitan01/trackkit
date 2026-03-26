"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-surface rounded-xl border border-white/5 p-5">
      <div className="text-[11px] font-semibold text-white/35 tracking-wide uppercase mb-2">{label}</div>
      <div className={`text-2xl font-extrabold tracking-tight ${accent ? "text-brand" : "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-white/40">Failed to load</div>;

  const usagePercent = data.usage.percentUsed;

  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Deliveries" value={String(data.stats.activeDeliveries)} accent />
        <StatCard label="Total Deliveries" value={String(data.stats.totalDeliveries)} />
        <StatCard label="Live Connections" value={String(data.stats.liveConnections)} />
        <StatCard
          label="Plan"
          value={data.plan}
          sub={`${data.usage.deliveriesThisMonth} / ${data.usage.limit} deliveries`}
        />
      </div>

      {/* Usage bar */}
      <div className="bg-surface rounded-xl border border-white/5 p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold">Monthly Usage</div>
          <div className="text-xs text-white/40">{usagePercent}% used</div>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(usagePercent, 100)}%`,
              background: usagePercent > 80 ? "#ef4444" : "linear-gradient(90deg, #38bdf8, #0ea5e9)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-white/25">
          <span>{data.usage.deliveriesThisMonth} deliveries this month</span>
          <span>Limit: {data.usage.limit}</span>
        </div>
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl border border-white/5 p-5">
          <div className="text-sm font-bold mb-3">Account</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Name</span>
              <span className="font-medium">{data.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Slug</span>
              <span className="font-mono text-xs text-brand/70">{data.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">ID</span>
              <span className="font-mono text-[11px] text-white/30">{data.id}</span>
            </div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-white/5 p-5">
          <div className="text-sm font-bold mb-3">Quick Links</div>
          <div className="space-y-2">
            <a href="/docs" className="block text-sm text-brand/60 hover:text-brand transition">
              API Documentation →
            </a>
            <a href="https://www.npmjs.com/package/trackkit-sdk" target="_blank" className="block text-sm text-brand/60 hover:text-brand transition">
              SDK on npm →
            </a>
            <a href="https://www.npmjs.com/package/trackkit-widget" target="_blank" className="block text-sm text-brand/60 hover:text-brand transition">
              Widget on npm →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
