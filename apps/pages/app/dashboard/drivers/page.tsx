"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    api.listDrivers().then((r) => setDrivers(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold tracking-tight">Drivers</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-brand text-base text-sm font-bold hover:opacity-90 transition">
          Add Driver
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_120px_120px] px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wide border-b border-white/5">
          <span>Name</span><span>Phone</span><span>Status</span><span>Location</span><span>External ID</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/20 text-sm">Loading...</div>
        ) : drivers.length === 0 ? (
          <div className="p-8 text-center text-white/20 text-sm">No drivers yet</div>
        ) : (
          drivers.map((d) => (
            <div key={d.id} className="grid grid-cols-[1fr_1fr_100px_120px_120px] px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition text-sm items-center">
              <span className="font-medium">{d.name}</span>
              <span className="text-white/40 text-xs">{d.phone || "--"}</span>
              <span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.isOnline ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"}`}>
                  {d.isOnline ? "Online" : "Offline"}
                </span>
              </span>
              <span className="text-xs text-white/30 font-mono">{d.lat ? `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}` : "--"}</span>
              <span className="text-xs text-white/30 font-mono">{d.externalId || "--"}</span>
            </div>
          ))
        )}
      </div>

      {showCreate && <CreateDriverModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateDriverModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [extId, setExtId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createDriver({ name, phone: phone || undefined, externalId: extId || undefined });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Add Driver</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-lg transition">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Emeka Obi" autoFocus className="w-full px-3 py-2.5 rounded-lg bg-base border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/40 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" className="w-full px-3 py-2.5 rounded-lg bg-base border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/40 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">External ID (optional)</label>
            <input value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="DRV-100" className="w-full px-3 py-2.5 rounded-lg bg-base border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/40 transition" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading || !name} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-sky-500 text-sm font-bold text-base disabled:opacity-40 transition">
            {loading ? "Creating..." : "Add Driver"}
          </button>
        </form>
      </div>
    </div>
  );
}
