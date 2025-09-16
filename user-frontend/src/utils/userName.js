// src/utils/userName.js
// Synchronous name resolver. Never throws, always returns a string.

const AUTH_KEYS = ["authToken", "token", "idToken", "access_token"];

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function pick(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
function firstWord(s) {
  const t = String(s || "").trim();
  return t.split(/\s+/)[0] || t;
}

function tryName(o) {
  if (!o || typeof o !== "object") return "";
  const base = pick(
    o.display_name, o.displayName, o.full_name, o.fullName, o.name,
    `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim(),
    `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim(),
    o.username,
    o.email && o.email.split("@")[0]
  );
  return base ? firstWord(base) : "";
}

function deepFindName(obj) {
  const seen = new Set();
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    const n = tryName(cur);
    if (n) return n;
    // common nests
    for (const k of ["user", "profile", "data", "payload", "account", "result"]) {
      if (cur[k]) stack.push(cur[k]);
    }
    for (const k in cur) if (cur[k] && typeof cur[k] === "object") stack.push(cur[k]);
  }
  return "";
}

function scanLocalStorageForName() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      // JWT-like tokens
      if (/token/i.test(k)) {
        const claims = parseJwt(raw);
        const fromClaims = tryName(claims);
        if (fromClaims) return fromClaims;
      }

      // JSON blobs
      try {
        const obj = JSON.parse(raw);
        const n = deepFindName(obj);
        if (n) return n;
      } catch { /* not JSON */ }
    }
  } catch {}
  return "";
}

export function getDisplayName({ user, profile } = {}) {
  // 1) explicit objects first
  const fromProfile = tryName(profile);
  if (fromProfile) return fromProfile;

  const fromUser = tryName(user);
  if (fromUser) return fromUser;

  // 2) JWT claims in common keys
  for (const key of AUTH_KEYS) {
    const tok = localStorage.getItem(key);
    if (tok) {
      const claims = parseJwt(tok);
      const claimName = tryName(claims);
      if (claimName) return claimName;
    }
  }

  // 3) any other cached JSON
  const scanned = scanLocalStorageForName();
  if (scanned) return scanned;

  // 4) fallback
  return "Friend";
}
