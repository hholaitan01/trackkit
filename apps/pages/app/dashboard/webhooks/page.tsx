"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const ALL_EVENTS = [
  "delivery.created",
  "delivery.status_changed",
  "delivery.driver_assigned",
  "delivery.location_updated",
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    api.listWebhooks().then((r) => setWebhooks(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      await api.deleteWebhook(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold tracking-tight">Webhooks</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-brand text-base text-sm font-bold hover:opacity-90 transition">
          Add Webhook
        </button>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-white/20 text-sm">Loading...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-white/20 text-sm">No webhooks configured</div>
        ) : (
          webhooks.map((w) => (
            <div key={w.id} className="bg-surface rounded-xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${w.isActive ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"}`}>
                  {w.isActive ? "Active" : "Paused"}
                </span>
                <button onClick={() => deleteWebhook(w.id)} className="text-xs text-red-400/50 hover:text-red-400 transition">Delete</button>
              </div>
              <div className="font-mono text-xs text-white/50 break-all mb-2">{w.url}</div>
              <div className="flex flex-wrap gap-1">
                {(w.events || []).map((e: string) => (
                  <span key={e} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-brand/8 text-brand/60">{e.split(".")[1]}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_80px_60px] px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wide border-b border-white/5">
          <span>URL</span><span>Events</span><span>Status</span><span></span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/20 text-sm">Loading...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-white/20 text-sm">No webhooks configured</div>
        ) : (
          webhooks.map((w) => (
            <div key={w.id} className="grid grid-cols-[1.5fr_1fr_80px_60px] px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition text-sm items-center">
              <span className="font-mono text-xs text-white/50 truncate">{w.url}</span>
              <div className="flex flex-wrap gap-1">
                {(w.events || []).map((e: string) => (
                  <span key={e} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-brand/8 text-brand/60">{e.split(".")[1]}</span>
                ))}
              </div>
              <span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${w.isActive ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"}`}>
                  {w.isActive ? "Active" : "Paused"}
                </span>
              </span>
              <button onClick={() => deleteWebhook(w.id)} className="text-xs text-red-400/50 hover:text-red-400 transition">Delete</button>
            </div>
          ))
        )}
      </div>

      {showCreate && <CreateWebhookModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateWebhookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["delivery.status_changed"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleEvent = (e: string) => {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createWebhook({ url, events });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Add Webhook</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-lg transition">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">Endpoint URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourapp.com/webhooks/trackkit" autoFocus
              className="w-full px-3 py-2.5 rounded-lg bg-base border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/40 transition font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Events</label>
            <div className="space-y-2">
              {ALL_EVENTS.map((e) => (
                <label key={e} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                    events.includes(e) ? "bg-brand border-brand" : "border-white/20 group-hover:border-white/40"
                  }`}>
                    {events.includes(e) && <span className="text-[10px] text-base font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-white/60 group-hover:text-white/80 transition">{e}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading || !url || events.length === 0} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-sky-500 text-sm font-bold text-base disabled:opacity-40 transition">
            {loading ? "Creating..." : "Create Webhook"}
          </button>
        </form>
      </div>
    </div>
  );
}
