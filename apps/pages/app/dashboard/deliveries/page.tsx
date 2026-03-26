"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  CONFIRMED: "#22c55e",
  DRIVER_ASSIGNED: "#3b82f6",
  PICKUP_EN_ROUTE: "#8b5cf6",
  PICKED_UP: "#a855f7",
  DELIVERING: "#f59e0b",
  ARRIVING: "#ef4444",
  DELIVERED: "#22c55e",
  CANCELLED: "#6b7280",
};

const VALID_STATUSES = [
  "CONFIRMED", "DRIVER_ASSIGNED", "PICKUP_EN_ROUTE",
  "PICKED_UP", "DELIVERING", "ARRIVING", "DELIVERED", "CANCELLED",
];

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const load = () => {
    const params = filter ? `status=${filter}` : "";
    api.listDeliveries(params).then((r) => setDeliveries(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold tracking-tight">Deliveries</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-brand text-base text-sm font-bold hover:opacity-90 transition">
          New Delivery
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["", "PENDING", "DELIVERING", "DELIVERED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === s ? "bg-brand/15 text-brand border border-brand/25" : "bg-white/[0.03] text-white/40 border border-white/5 hover:text-white/60"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_1.5fr_120px_100px_80px] px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wide border-b border-white/5">
          <span>Code</span><span>Pickup</span><span>Dropoff</span><span>Status</span><span>ETA</span><span></span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/20 text-sm">Loading...</div>
        ) : deliveries.length === 0 ? (
          <div className="p-8 text-center text-white/20 text-sm">No deliveries found</div>
        ) : (
          deliveries.map((d) => (
            <div key={d.id} className="grid grid-cols-[1fr_1.5fr_1.5fr_120px_100px_80px] px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition text-sm items-center">
              <span className="font-mono text-xs text-brand/80">{d.trackingCode}</span>
              <span className="text-white/50 truncate text-xs">{d.pickupAddress}</span>
              <span className="text-white/50 truncate text-xs">{d.dropoffAddress}</span>
              <span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${STATUS_COLORS[d.status]}18`, color: STATUS_COLORS[d.status] }}>
                  {d.status}
                </span>
              </span>
              <span className="text-xs text-white/40">{d.currentEtaMinutes ? `${d.currentEtaMinutes} min` : "--"}</span>
              <button onClick={() => setSelected(d)} className="text-xs text-brand/50 hover:text-brand transition">Details</button>
            </div>
          ))
        )}
      </div>

      {showCreate && <CreateDeliveryModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {selected && <DeliveryDetailModal delivery={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); load(); }} />}
    </div>
  );
}

function CreateDeliveryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [extId, setExtId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createDelivery({ pickup: { address: pickup }, dropoff: { address: dropoff }, externalId: extId || undefined });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Delivery" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Pickup Address" value={pickup} onChange={setPickup} placeholder="Yaba Tech, Lagos, Nigeria" />
        <Field label="Dropoff Address" value={dropoff} onChange={setDropoff} placeholder="Victoria Island, Lagos, Nigeria" />
        <Field label="External ID (optional)" value={extId} onChange={setExtId} placeholder="ORDER-123" />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button type="submit" disabled={loading || !pickup || !dropoff} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-sky-500 text-sm font-bold text-base disabled:opacity-40 transition">
          {loading ? "Creating..." : "Create Delivery"}
        </button>
      </form>
    </Modal>
  );
}

function DeliveryDetailModal({ delivery, onClose, onUpdated }: { delivery: any; onClose: () => void; onUpdated: () => void }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      await api.updateStatus(delivery.id, status);
      onUpdated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Delivery ${delivery.trackingCode}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-white/35 text-xs block">Status</span><span className="font-bold" style={{ color: STATUS_COLORS[delivery.status] }}>{delivery.status}</span></div>
          <div><span className="text-white/35 text-xs block">ETA</span>{delivery.currentEtaMinutes ? `${delivery.currentEtaMinutes} min` : "--"}</div>
          <div><span className="text-white/35 text-xs block">Pickup</span><span className="text-xs text-white/60">{delivery.pickupAddress}</span></div>
          <div><span className="text-white/35 text-xs block">Dropoff</span><span className="text-xs text-white/60">{delivery.dropoffAddress}</span></div>
          <div><span className="text-white/35 text-xs block">Driver</span>{delivery.driver?.name || "Unassigned"}</div>
          <div><span className="text-white/35 text-xs block">Distance</span>{delivery.currentDistanceKm ? `${delivery.currentDistanceKm} km` : "--"}</div>
        </div>

        {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
          <>
            <div className="text-xs font-semibold text-white/35 mt-4">Update Status</div>
            <div className="flex flex-wrap gap-2">
              {VALID_STATUSES.map((s) => (
                <button key={s} onClick={() => updateStatus(s)} disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: `${STATUS_COLORS[s]}40`, color: STATUS_COLORS[s] }}
                >{s}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-lg transition">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/40 mb-1.5">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg bg-base border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/40 transition" />
    </div>
  );
}
