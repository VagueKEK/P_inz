import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureCsrf() {
  await fetch(`${API_BASE}/api/csrf/`, { credentials: "include" });
}

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

http.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    if (!getCookie("csrftoken")) await ensureCsrf();
    config.headers = config.headers || {};
    config.headers["X-CSRFToken"] = getCookie("csrftoken") || "";
  }
  return config;
});

export default function AdminUsersPage() {
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const canSee = !!user?.isAdmin;

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await http.get("/api/admin/users/", { params: q ? { q } : {} });
      setUsers(res.data || []);
    } catch (e) {
      setMsg(e?.response?.data?.error || e?.message || "Błąd pobierania userów");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canSee) load();
  }, [canSee]);

  const count = useMemo(() => users.length, [users]);

  async function toggleActive(u) {
    setMsg("");
    try {
      await http.patch(`/api/admin/users/${u.id}/`, { is_active: !u.is_active });
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e?.message || "Nie udało się zmienić statusu");
    }
  }

  async function deleteUser(u) {
    if (!confirm(`Usunąć użytkownika "${u.username}"?`)) return;
    setMsg("");
    try {
      await http.delete(`/api/admin/users/${u.id}/`);
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e?.message || "Nie udało się usunąć");
    }
  }

  async function clearSubscriptions(u) {
    if (!confirm(`Wyczyścić wszystkie subskrypcje dla "${u.username}"?`)) return;
    setMsg("");
    try {
      const res = await http.post(`/api/admin/users/${u.id}/clear-subscriptions/`, {});
      setMsg(`Wyczyszczono subskrypcje: ${u.username} (usunięto: ${res.data?.deleted ?? 0})`);
    } catch (e) {
      setMsg(e?.response?.data?.error || e?.message || "Nie udało się wyczyścić subskrypcji");
    }
  }

  async function resetPassword() {
    if (!resetFor) return;
    if (!newPassword || newPassword.length < 8) {
      setMsg("Hasło musi mieć min. 8 znaków");
      return;
    }
    setMsg("");
    try {
      await http.post(`/api/admin/users/${resetFor.id}/reset-password/`, { newPassword });
      setMsg(`Hasło zresetowane dla: ${resetFor.username}`);
      setResetFor(null);
      setNewPassword("");
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e?.message || "Reset hasła nie wyszedł");
    }
  }

  if (!canSee) {
    return (
      <section className="card stack gap">
        <h2>Użytkownicy</h2>
        <div className="muted">Brak uprawnień.</div>
      </section>
    );
  }

  return (
    <section className="card stack gap">
      <div className="row between center">
        <h2>Użytkownicy</h2>
        <button className="btn" onClick={load} disabled={loading}>Odśwież</button>
      </div>

      <div className="row gap">
        <input
          className="input"
          placeholder="Szukaj po loginie albo mailu…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-sky" onClick={load} disabled={loading}>Szukaj</button>
      </div>

      {msg && <div className="muted">{msg}</div>}
      <div className="muted">Wyniki: {count}</div>

      <div className="card inner stack gap">
        {loading ? (
          <div className="muted">Ładowanie…</div>
        ) : users.length ? (
          users.map((u) => (
            <div key={u.id} className="row between center" style={{ gap: 12 }}>
              <div style={{ minWidth: 260 }}>
                <div className="bold">
                  {u.username} {u.is_staff ? "(admin)" : ""}
                </div>
                <div className="muted">{u.email || "—"}</div>
                <div className="muted">{u.is_active ? "aktywny" : "zablokowany"}</div>
              </div>

              <div className="row gap" style={{ flexWrap: "wrap" }}>
                <button
                  className={u.is_active ? "btn btn-amber" : "btn btn-green"}
                  onClick={() => toggleActive(u)}
                >
                  {u.is_active ? "Dezaktywuj" : "Aktywuj"}
                </button>

                <button className="btn btn-sky" onClick={() => { setResetFor(u); setNewPassword(""); }}>
                  Reset hasła
                </button>

                <button className="btn" onClick={() => clearSubscriptions(u)}>
                  Wyczyść suby
                </button>

                <button className="btn btn-rose" onClick={() => deleteUser(u)}>
                  Usuń
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="muted">Brak użytkowników.</div>
        )}
      </div>

      {resetFor && (
        <div className="card inner stack gap">
          <div className="bold">Reset hasła: {resetFor.username}</div>
          <input
            className="input"
            type="password"
            placeholder="Nowe hasło (min 8)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="row gap">
            <button className="btn btn-green" onClick={resetPassword}>Zapisz</button>
            <button className="btn" onClick={() => { setResetFor(null); setNewPassword(""); }}>Anuluj</button>
          </div>
        </div>
      )}
    </section>
  );
}
