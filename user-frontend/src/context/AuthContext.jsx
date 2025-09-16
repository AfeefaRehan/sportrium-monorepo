import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  me,
  logout as apiLogout,
  getToken,
} from "@/lib/api";

const AuthContext = createContext(null);

// cache the last fetched user so the UI has something immediately on reload
const STORAGE_KEY = "auth:user";
const readStoredUser = () => {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const persistUser = (user, remember) => {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(STORAGE_KEY, JSON.stringify(user));
  // remove from the other storage
  (remember ? sessionStorage : localStorage).removeItem(STORAGE_KEY);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  // on mount: if a token exists, fetch the current user
  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          const u = await me();
          const normalized = u?.user || u || null;
          if (normalized) {
            setUser(normalized);
            // keep whatever we already used (default to localStorage)
            persistUser(normalized, true);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Login with API, then fetch the user
  const login = async ({ email, password, remember = true }) => {
    const res = await apiLogin({ email, password }); // sets JWT in localStorage (see api.js)
    if (!res?.access_token) throw new Error("Login failed");
    const u = await me();
    const normalized = u?.user || u || null;
    if (!normalized) throw new Error("Could not load account");
    setUser(normalized);
    persistUser(normalized, remember);
    return normalized;
  };

  // Register with API, then fetch the user
  const signup = async ({ name, email, password, remember = true }) => {
    const res = await apiRegister({ email, password, display_name: name });
    if (!res?.access_token) throw new Error("Sign up failed");
    const u = await me();
    const normalized = u?.user || u || null;
    if (!normalized) throw new Error("Could not load account");
    setUser(normalized);
    persistUser(normalized, remember);
    return normalized;
  };

  const logout = () => {
    try { apiLogout(); } catch {}
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
