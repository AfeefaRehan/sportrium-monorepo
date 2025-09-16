const RAW = (import.meta.env as any).VITE_ADMIN_API_URL as string | undefined;
const BASE = (RAW || "").replace(/\/$/, ""); // trim trailing slash

const TOKEN_KEY = "adminToken";
export const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || "";

function toHeaderObject(h?: HeadersInit): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) return Object.fromEntries(h.entries());
  if (Array.isArray(h)) return Object.fromEntries(h as [string, string][]);
  return h as Record<string, string>;
}

function qs(params?: Record<string, any>) {
  if (!params) return "";
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return s ? `?${s}` : "";
}

async function request(path: string, opts: RequestInit = {}, needAuth = true) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...toHeaderObject(opts.headers),
  };
  const t = getAccessToken();
  if (needAuth && t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: "omit" });
  const text = await res.text().catch(() => "");
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) throw new Error((data && (data.message || data.error)) || res.statusText);
  return data;
}

export const api = {
  get: (p: string, params?: Record<string, any>, needAuth = true) => request(`${p}${qs(params)}`, {}, needAuth),
  post: (p: string, body?: any, needAuth = true) => request(p, { method: "POST", body: JSON.stringify(body || {}) }, needAuth),
  patch: (p: string, body?: any, needAuth = true) => request(p, { method: "PATCH", body: JSON.stringify(body || {}) }, needAuth),
  del: (p: string, needAuth = true) => request(p, { method: "DELETE" }, needAuth),
};
