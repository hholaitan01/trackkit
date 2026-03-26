const API_BASE = "https://trackkitapi-production.up.railway.app";

function getKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("tk_api_key") || "";
}

export function setApiKey(key: string) {
  localStorage.setItem("tk_api_key", key);
}

export function clearApiKey() {
  localStorage.removeItem("tk_api_key");
}

export function hasApiKey(): boolean {
  return !!getKey();
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearApiKey();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data as T;
}

export const api = {
  // Tenant
  me: () => request<any>("GET", "/v1/tenants/me"),
  updateBranding: (data: any) => request<any>("PATCH", "/v1/tenants/me", data),

  // Deliveries
  listDeliveries: (params?: string) =>
    request<{ data: any[]; count: number }>("GET", `/v1/deliveries${params ? `?${params}` : ""}`),
  getDelivery: (id: string) => request<any>("GET", `/v1/deliveries/${id}`),
  createDelivery: (data: any) => request<any>("POST", "/v1/deliveries", data),
  updateStatus: (id: string, status: string) =>
    request<any>("PATCH", `/v1/deliveries/${id}/status`, { status }),
  assignDriver: (id: string, driverId: string) =>
    request<any>("POST", `/v1/deliveries/${id}/assign`, { driverId }),

  // Drivers
  listDrivers: (params?: string) =>
    request<{ data: any[]; count: number }>("GET", `/v1/drivers${params ? `?${params}` : ""}`),
  createDriver: (data: any) => request<any>("POST", "/v1/drivers", data),

  // API Keys
  listKeys: () => request<{ data: any[] }>("GET", "/v1/tenants/me/keys"),
  createKey: (data: any) => request<any>("POST", "/v1/tenants/me/keys", data),
  deleteKey: (id: string) => request<any>("DELETE", `/v1/tenants/me/keys/${id}`),

  // Analytics
  analytics: () => request<any>("GET", "/v1/analytics"),

  // Webhooks
  listWebhooks: () => request<{ data: any[] }>("GET", "/v1/webhooks"),
  createWebhook: (data: any) => request<any>("POST", "/v1/webhooks", data),
  deleteWebhook: (id: string) => request<any>("DELETE", `/v1/webhooks/${id}`),
};
