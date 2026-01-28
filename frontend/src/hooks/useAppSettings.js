import { useCallback, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureCsrf() {
  await fetch(`${API_BASE}/api/csrf/`, { credentials: "include" });
}

export default function useAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    currency_code: "PLN",
    currency_symbol: "zł",
    limit_on: false,
    limit_val: "0",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/settings/me/`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSettings({
        currency_code: data.currency_code ?? "PLN",
        currency_symbol: data.currency_symbol ?? "zł",
        limit_on: !!data.limit_on,
        limit_val: String(data.limit_val ?? "0"),
      });
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (patch) => {
    setSaving(true);
    setError("");
    try {
      if (!getCookie("csrftoken")) await ensureCsrf();
      const res = await fetch(`${API_BASE}/api/settings/me/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
        body: JSON.stringify(patch || {}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSettings({
        currency_code: data.currency_code ?? "PLN",
        currency_symbol: data.currency_symbol ?? "zł",
        limit_on: !!data.limit_on,
        limit_val: String(data.limit_val ?? "0"),
      });
      window.dispatchEvent(new Event("app-settings-changed"));
      return data;
    } catch (e) {
      setError(String(e?.message || e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    saving,
    error,
    currencyCode: settings.currency_code,
    currencySymbol: settings.currency_symbol,
    limitOn: settings.limit_on,
    limitVal: settings.limit_val,
    refresh,
    saveSettings,
  };
}
