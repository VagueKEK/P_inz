import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AuthCtx = createContext(null);

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureCsrf() {
  await fetch(`${API_BASE}/api/csrf/`, { credentials: "include" });
}

async function jfetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    const txt = await res.text().catch(() => "");
    data = txt ? { raw: txt } : null;
  }

  if (!res.ok) {
    const msg = data?.error || data?.detail || data?.raw || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
  setLoading(true);
  try {
    const data = await jfetch("/api/auth/me/");
    if (data?.isAuthenticated) {
      setUser(data.user);
      return;
    }
    setUser(null);
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.status === 403 && msg.toLowerCase().includes("dezaktyw")) {
      setUser(null);
      throw e;
    }
    setUser(null);
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username, password) => {
    await ensureCsrf();
    const csrftoken = getCookie("csrftoken") || "";

    const data = await jfetch("/api/auth/login/", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({ username, password }),
    });

    setUser(data.user || null);
    return data;
  }, []);

  const register = useCallback(async (username, password, email = "") => {
    await ensureCsrf();
    const csrftoken = getCookie("csrftoken") || "";

    const data = await jfetch("/api/auth/register/", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({ username, password, email }),
    });

    setUser(data.user || null);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await ensureCsrf();
    const csrftoken = getCookie("csrftoken") || "";

    await jfetch("/api/auth/logout/", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({}),
    });

    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
