// src/lib/api.js
// ---------------------------------------------
// Base config
// ---------------------------------------------
const BASE = (import.meta.env?.VITE_API_URL ?? "/api").replace(/\/$/, "");
const USE_MOCKS =
  String(import.meta.env?.VITE_USE_MOCKS ?? "").toLowerCase() === "true";
const MOCK_LATENCY = Number(import.meta.env?.VITE_MOCK_LATENCY ?? 250);

const AUTH_KEY = "authToken";                 // JWT stored in localStorage
const Q_KEY   = "sportrium.syncQueue:v1";     // offline queue
const T_KEY   = "sportrium.pushToken:v1";     // saved push token

// Local keys used by the app already
const LS_PROFILE = "profile";
const LS_MY_TEAMS = "my_teams";
const LS_HOSTED = "hosted_events";
const LS_REMINDERS = "reminders";

const load = (k, fb) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ---------------------------------------------
// Auth token helpers
// ---------------------------------------------
export const getToken = () => localStorage.getItem(AUTH_KEY) || null;
export const setToken = (t) => t ? localStorage.setItem(AUTH_KEY, t)
                                 : localStorage.removeItem(AUTH_KEY);

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function fullUrl(path) {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------
// MOCK HANDLERS (enable with VITE_USE_MOCKS=true)
// ---------------------------------------------
async function mockRequest(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : null;

  // tiny router
  const route = path.replace(/^\/+/, ""); // e.g. "auth/login" or "me"
  await sleep(MOCK_LATENCY);

  // ---- AUTH (optional – your UI uses AuthContext; we still support these) ----
  if (method === "POST" && route === "auth/register") {
    const users = load("mock_users", []);
    if (users.some((u) => u.email === body?.email)) {
      throw new Error("email already registered");
    }
    const user = {
      id: "u_" + Date.now(),
      email: body?.email,
      display_name: body?.display_name || "User",
      avatar_url: null,
      city: null,
      bio: null,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    save("mock_users", users);
    return { access_token: "mock.jwt.token." + user.id, user };
  }

  if (method === "POST" && route === "auth/login") {
    const users = load("mock_users", []);
    const u = users.find((x) => x.email === body?.email);
    if (!u) throw new Error("invalid email or password");
    return { access_token: "mock.jwt.token." + u.id, user: u };
  }

  if (method === "GET" && (route === "auth/me" || route === "me")) {
    // If you logged in via AuthContext only, still return a local profile
    const p = load(LS_PROFILE, null) || {
      display_name: "Test User",
      email: "test@example.com",
      city: "",
      bio: "",
      avatar_url: "",
      sports: ["cricket", "football"],
      created_at: new Date().toISOString(),
    };
    return p;
  }

  if (method === "PATCH" && route === "me") {
    const prev = load(LS_PROFILE, {});
    const merged = {
      ...prev,
      display_name: body?.display_name ?? prev.display_name ?? "",
      email: body?.email ?? prev.email ?? "",
      city: body?.city ?? prev.city ?? "",
      bio: body?.bio ?? prev.bio ?? "",
      avatar_url: body?.avatar_url ?? prev.avatar_url ?? "",
      sports: Array.isArray(body?.sports) ? body.sports : prev.sports ?? [],
    };
    save(LS_PROFILE, merged);
    return merged;
  }

  // ---- TEAMS / EVENTS ----
  if (method === "GET" && route === "teams/mine") {
    return load(LS_MY_TEAMS, []);
  }
  if (method === "GET" && route === "events/hosted") {
    return load(LS_HOSTED, []);
  }

  // ---- REMINDERS ----
  if (method === "POST" && route === "reminders") {
    const list = load(LS_REMINDERS, []);
    const item = body || {};
    if (!item.id) item.id = "rm-" + Math.random().toString(36).slice(2, 8);
    const ix = list.findIndex((x) => x.id === item.id);
    if (ix >= 0) list[ix] = { ...list[ix], ...item };
    else list.push(item);
    save(LS_REMINDERS, list);
    return { ok: true, id: item.id };
  }
  if (method === "DELETE" && route.startsWith("reminders/")) {
    const id = route.split("/")[1];
    const list = load(LS_REMINDERS, []);
    save(LS_REMINDERS, list.filter((x) => x.id !== id));
    return { ok: true };
  }

  // ---- PUSH TOKENS ----
  if (method === "POST" && route === "push/tokens") {
    if (body?.token) localStorage.setItem(T_KEY, body.token);
    return { ok: true };
  }
  if (method === "DELETE" && route.startsWith("push/tokens/")) {
    localStorage.removeItem(T_KEY);
    return { ok: true };
  }

  // Fallback
  throw new Error(`[mocks] No handler for ${method} /${route}`);
}

// ---------------------------------------------
// Low-level request helper
// ---------------------------------------------
async function request(path, opts = {}) {
  if (USE_MOCKS) {
    // Route through local mocks
    return mockRequest(path.replace(/^\/+api\//, ""), opts);
  }

  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  // IMPORTANT: do NOT send cookies — avoids CORS-credentials requirement
  const res = await fetch(fullUrl(path), { ...opts, headers, credentials: "omit" });

  // Try to parse JSON safely
  let data = null;
  const text = await res.text().catch(() => "");
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || text || res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data;
}

// ---------------------------------------------
// Simple wrapper
// ---------------------------------------------
export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body: JSON.stringify(body) }),
  patch: (p, body) => request(p, { method: "PATCH", body: JSON.stringify(body) }),
  del: (p) => request(p, { method: "DELETE" }),
};

// ---------------------------------------------
// Optional: tiny auth helpers
// ---------------------------------------------
export async function register({ email, password, display_name }) {
  const res = await api.post("/auth/register", { email, password, display_name });
  if (res?.access_token) setToken(res.access_token);
  return res;
}
export async function login({ email, password }) {
  const res = await api.post("/auth/login", { email, password });
  if (res?.access_token) setToken(res.access_token);
  return res;
}
export const me = () => api.get("/auth/me"); // mocks also accept "/me"
export const logout = () => { setToken(null); return true; };

// ---------------------------------------------
// Offline sync queue
// ---------------------------------------------
export async function syncQueue() {
  const q = load(Q_KEY, []);
  if (!q.length) return;

  const remaining = [];
  for (const item of q) {
    try {
      switch (item.kind) {
        case "push:save":
          await request("/push/tokens", { method: "POST", body: JSON.stringify({ token: item.token }) });
          break;
        case "push:revoke":
          await request(`/push/tokens/${encodeURIComponent(item.token)}`, { method: "DELETE" });
          break;
        case "reminders:upsert":
          await request("/reminders", { method: "POST", body: JSON.stringify(item.rem) });
          break;
        case "reminders:delete":
          await request(`/reminders/${item.id}`, { method: "DELETE" });
          break;
        default:
          break;
      }
    } catch {
      remaining.push(item);
    }
  }
  save(Q_KEY, remaining);
}

if (typeof window !== "undefined") {
  setTimeout(syncQueue, 0);
  window.addEventListener("online", syncQueue);
}

export const getSyncQueue = () => load(Q_KEY, []);
export const clearSyncQueue = () => localStorage.removeItem(Q_KEY);

// ---------------------------------------------
// Push token helpers (offline-first)
// ---------------------------------------------
export async function savePushToken(token) {
  try {
    await request("/push/tokens", { method: "POST", body: JSON.stringify({ token }) });
    localStorage.setItem(T_KEY, token);
    return true;
  } catch {
    const q = load(Q_KEY, []);
    q.push({ kind: "push:save", token, ts: Date.now() });
    save(Q_KEY, q);
    localStorage.setItem(T_KEY, token);
    return false;
  }
}

export function getSavedPushToken() { return localStorage.getItem(T_KEY) || null; }

export async function revokePushToken() {
  const token = localStorage.getItem(T_KEY);
  if (!token) return true;
  try {
    await request(`/push/tokens/${encodeURIComponent(token)}`, { method: "DELETE" });
    localStorage.removeItem(T_KEY);
    return true;
  } catch {
    const q = load(Q_KEY, []);
    q.push({ kind: "push:revoke", token, ts: Date.now() });
    save(Q_KEY, q);
    localStorage.removeItem(T_KEY);
    return false;
  }
}

// ---------------------------------------------
// Reminders (offline-first; queues when offline)
// ---------------------------------------------
export async function upsertReminder(rem) {
  try {
    await request("/reminders", { method: "POST", body: JSON.stringify(rem) });
    return true;
  } catch {
    const q = load(Q_KEY, []);
    q.push({ kind: "reminders:upsert", rem, ts: Date.now() });
    save(Q_KEY, q);
    return false;
  }
}

export async function deleteReminder(id) {
  try {
    await request(`/reminders/${id}`, { method: "DELETE" });
    return true;
  } catch {
    const q = load(Q_KEY, []);
    q.push({ kind: "reminders:delete", id, ts: Date.now() });
    save(Q_KEY, q);
    return false;
  }
}
