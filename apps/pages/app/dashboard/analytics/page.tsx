"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  CONFIRMED: "#60a5fa",
  DRIVER_ASSIGNED: "#a78bfa",
  PICKUP_EN_ROUTE: "#fb923c",
  PICKED_UP: "#fbbf24",
  DELIVERING: "#38bdf8",
  ARRIVING: "#34d399",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
};

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-surface rounded-xl border border-white/5 p-5">
      <div className="text-[11px] font-semibold text-white/35 tracking-wide uppercase mb-2">{label}</div>
      <div className={`text-2xl font-extrabold tracking-tight ${accent ? "text-brand" : "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

function MiniBar({ data, maxVal }: { data: { date: string; count: number }[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-[2px] h-28">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center group relative">
          <div
            className="w-full rounded-t bg-brand/70 hover:bg-brand transition-colors min-h-[2px]"
            style={{ height: `${maxVal > 0 ? Math.max((d.count / maxVal) * 100, 2) : 2}%` }}
          />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-white/10 rounded-md px-2 py-1 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
            {d.date.slice(5)}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function HourlyChart({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  return (
    <div className="flex items-end gap-[3px] h-20">
      {hours.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          <div
            className="w-full rounded-t bg-violet-500/60 hover:bg-violet-500 transition-colors min-h-[2px]"
            style={{ height: `${Math.max((count / max) * 100, 2)}%` }}
          />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-white/10 rounded-md px-2 py-1 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
            {String(i).padStart(2, "0")}:00 — {count}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBreakdown({ byStatus }: { byStatus: Record<string, number> }) {
  const total = Object.values(byStatus).reduce((s, c) => s + c, 0) || 1;
  const entries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2.5">
      {entries.map(([status, count]) => (
        <div key={status}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[status] || "#64748b" }} />
              <span className="text-xs font-medium text-white/60">{status.replace(/_/g, " ")}</span>
            </div>
            <span className="text-xs font-bold text-white/80">{count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(count / total) * 100}%`,
                background: STATUS_COLORS[status] || "#64748b",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-white/5 rounded-xl" />)}
        </div>
        <div className="h-48 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!data) return <div className="text-white/40">Failed to load analytics</div>;

  const maxDaily = Math.max(...data.dailyVolume.map((d: any) => d.count), 1);
  const peakLabel = `${String(data.peakHour).padStart(2, "0")}:00`;

  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight mb-6">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          label="Last 30 Days"
          value={String(data.totalLast30Days)}
          sub="total deliveries"
          accent
        />
        <StatCard
          label="Avg Delivery Time"
          value={data.avgDeliveryMinutes != null ? `${data.avgDeliveryMinutes}m` : "—"}
          sub="confirmed → delivered"
        />
        <StatCard
          label="Completion Rate"
          value={data.completionRate != null ? `${data.completionRate}%` : "—"}
          sub={`${data.deliveredLast30Days} delivered`}
        />
        <StatCard
          label="Peak Hour"
          value={peakLabel}
          sub={`${data.hourlyDistribution[data.peakHour]} deliveries`}
        />
      </div>

      {/* Daily volume chart */}
      <div className="bg-surface rounded-xl border border-white/5 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold">Daily Volume</div>
          <div className="text-[11px] text-white/30">Last 30 days</div>
        </div>
        <MiniBar data={data.dailyVolume} maxVal={maxDaily} />
        <div className="flex justify-between mt-2 text-[10px] text-white/20">
          <span>{data.dailyVolume[0]?.date.slice(5)}</span>
          <span>{data.dailyVolume[data.dailyVolume.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Status breakdown */}
        <div className="bg-surface rounded-xl border border-white/5 p-5">
          <div className="text-sm font-bold mb-4">Status Breakdown</div>
          <StatusBreakdown byStatus={data.byStatus} />
        </div>

        {/* Hourly distribution */}
        <div className="bg-surface rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold">Hourly Distribution</div>
            <div className="text-[11px] text-white/30">24h pattern</div>
          </div>
          <HourlyChart hours={data.hourlyDistribution} />
          <div className="flex justify-between mt-2 text-[10px] text-white/20">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {/* Cancellation stats */}
      <div className="bg-surface rounded-xl border border-white/5 p-5">
        <div className="text-sm font-bold mb-3">Cancellations</div>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-extrabold text-red-400">{data.cancelledCount}</div>
          <div className="text-sm text-white/40">
            cancelled in the last 30 days
            {data.totalLast30Days > 0 && (
              <span className="text-white/25">
                {" "}({Math.round((data.cancelledCount / data.totalLast30Days) * 100)}% of total)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
