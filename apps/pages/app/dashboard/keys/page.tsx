"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function KeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<any>(null);

  const load = () => {
    api.listKeys().then((r) => setKeys(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteKey = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await api.deleteKey(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold tracking-tight">API Keys</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-brand text-base text-sm font-bold hover:opacity-90 transition">
          Create Key
        </button>
      </div>

      {newKey && (
        <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 mb-4">
          <div className="text-sm font-bold text-green-400 mb-1">New API Key Created</div>
          <div className="text-xs text-white/40 mb-2">Copy it now — it won&apos;t be shown again.</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-brand font-mono bg-base px-3 py-2 rounded-lg break-all">{newKey.key}</code>
            <button onClick={() => { navigator.clipboard.writeText(newKey.key); }} className="px-3 py-2 rounded-lg border border-brand/20 text-brand text-xs font-semibold hover:bg-brand/10 transition">
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_80px_120px_80px] px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wide border-b border-white/5">
          <span>Name</span><span>Key</span><span>Mode</span><span>Last Used</span><span></span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/20 text-sm">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-white/20 text-sm">No API keys</div>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="grid grid-cols-[1fr_1.5fr_80px_120px_80px] px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition text-sm items-center">
              <span className="font-medium">{k.name}</span>
              <span className="font-mono text-xs text-white/30">{k.key.slice(0, 16)}...{k.key.slice(-4)}</span>
              <span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${k.isLive ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                  {k.isLive ? "Live" : "Test"}
                </span>
              </span>
              <span className="text-xs text-white/30">{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "Never"}</span>
              <button onClick={() => deleteKey(k.id)} className="text-xs text-red-400/50 hover:text-red-400 transition">Revoke</button>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={(key) => { setShowCreate(false); setNewKey(key); load(); }} />
      )}
    </div>
  );
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: any) => void }) {
  const [name, setName] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const key = await api.createKey({ name: name || "Untitled Key", isLive });
      onCreated(key);
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
          <h2 className="text-base font-bold">Create API Key</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-lg transition">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">Key Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Backend" autoFocus className="w-full px-3 py-2.5 rounded-lg bg-base border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/40 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">Mode</label>
            <div className="flex gap-3">
              {[false, true].map((live) => (
                <button key={String(live)} type="button" onClick={() => setIsLive(live)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition ${
                    isLive === live
                      ? live ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                      : "border-white/10 text-white/30 hover:text-white/50"
                  }`}
                >{live ? "Live" : "Test"}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand to-sky-500 text-sm font-bold text-base disabled:opacity-40 transition">
            {loading ? "Creating..." : "Create Key"}
          </button>
        </form>
      </div>
    </div>
  );
}
