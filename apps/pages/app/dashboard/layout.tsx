"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasApiKey, clearApiKey, api } from "@/lib/api";
import Link from "next/link";

const nav = [
  { href: "/dashboard", label: "Overview", icon: "◎" },
  { href: "/dashboard/deliveries", label: "Deliveries", icon: "◇" },
  { href: "/dashboard/drivers", label: "Drivers", icon: "◉" },
  { href: "/dashboard/keys", label: "API Keys", icon: "⚿" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "↗" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (!hasApiKey()) {
      router.replace("/login");
      return;
    }
    api.me().then(setTenant).catch(() => {
      clearApiKey();
      router.replace("/login");
    });
  }, [router]);

  const logout = () => {
    clearApiKey();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-white/5 flex flex-col fixed inset-y-0">
        <Link href="/" className="p-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-sky-500 flex items-center justify-center text-xs font-black text-base">
            T
          </div>
          <span className="text-sm font-extrabold tracking-tight">TrackKit</span>
        </Link>

        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition ${
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Tenant info + logout */}
        <div className="p-4 border-t border-white/5">
          {tenant && (
            <div className="mb-3">
              <div className="text-xs font-bold text-white/70 truncate">{tenant.name}</div>
              <div className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wide">{tenant.plan} plan</div>
            </div>
          )}
          <button
            onClick={logout}
            className="text-xs text-white/30 hover:text-red-400 transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  );
}
