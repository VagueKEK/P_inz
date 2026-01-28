// src/components/SubscriptionPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import useAppSettings from "../hooks/useAppSettings";

// backend base
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SUBS_PATH = "/api/subscriptions/";

/* --- CSRF + session helpers --- */
function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureCsrf() {
  // ustawia cookie csrftoken po stronie backendu
  await fetch(`${API_BASE}/api/csrf/`, { credentials: "include" });
}

// axios client z cookies
const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // <-- MUSI być, inaczej nie leci sessionid
});

// interceptor: dopinamy CSRF do "unsafe" metod
http.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    if (!getCookie("csrftoken")) await ensureCsrf();
    config.headers = config.headers || {};
    config.headers["X-CSRFToken"] = getCookie("csrftoken") || "";
  }
  return config;
});

/* helpers */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const toISO = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};
const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const toNum = (x) => {
  const n = parseFloat(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const daysBetween = (a, b) => {
  const d1 = new Date(a); d1.setHours(0,0,0,0);
  const d2 = new Date(b); d2.setHours(0,0,0,0);
  return Math.round((d2 - d1) / 86400000);
};
const nextMonthlyDate = (anchor) => {
  if (!isISO(anchor)) return null;
  const a = new Date(anchor);
  const t = new Date(); t.setHours(0,0,0,0);
  if (a >= t) return a;
  const baseDay = a.getDate();
  let y = a.getFullYear(), m = a.getMonth();
  let candidate = new Date(a);
  while (candidate < t) {
    m += 1; if (m > 11) { m = 0; y += 1; }
    const nd = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0).getDate();
    nd.setDate(Math.min(baseDay, last));
    candidate = nd;
  }
  return candidate;
};

export default function SubscriptionPanel() {
  const { currencySymbol, limitOn, limitVal } = useAppSettings();

  const [subs, setSubs] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [editingDate, setEditingDate] = useState("");
  const [filterText, setFilterText] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");

  const addNameRef = useRef(null);

  const fetchSubs = async () => {
    // CSRF cookie też tu ustawiamy (nie boli), a potem GET z cookies sesji
    await ensureCsrf();
    const res = await http.get(SUBS_PATH);
    setSubs(Array.isArray(res.data) ? res.data : res.data.results || []);
  };

  useEffect(() => { fetchSubs(); }, []);

  /* CRUD */
  const handleAdd = async () => {
    if (!name.trim() || !price || !date) return;

    await http.post(SUBS_PATH, {
      name: name.trim(),
      price: String(price).replace(",", "."),
      next_payment: date,
      active: true,
    });

    setName(""); setPrice(""); setDate("");
    await fetchSubs();
    addNameRef.current?.focus();
  };

  const handleDelete = async (id) => {
    await http.delete(`${SUBS_PATH}${id}/`);
    fetchSubs();
  };

  const handleToggleActive = async (id, active) => {
    await http.patch(`${SUBS_PATH}${id}/`, { active: !active });
    fetchSubs();
  };

  const startEditing = (s) => {
    setEditingId(s.id);
    setEditingPrice(s.price ?? "");
    setEditingDate(s.next_payment ?? s.next_payment_date ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingPrice("");
    setEditingDate("");
  };

  const saveEdit = async (id) => {
    await http.patch(`${SUBS_PATH}${id}/`, {
      price: String(editingPrice).replace(",", "."),
      next_payment: editingDate || null,
    });
    cancelEdit();
    fetchSubs();
  };

  /* listy */
  const filterSubs = (arr) =>
    arr.filter((s) => (s.name || "").toLowerCase().includes(filterText.toLowerCase()));

  const sortSubs = (arr) => {
    const r = [...arr];
    switch (sortOption) {
      case "name-asc": r.sort((a,b)=>(a.name||"").localeCompare(b.name||"")); break;
      case "name-desc": r.sort((a,b)=>(b.name||"").localeCompare(a.name||"")); break;
      case "price-asc": r.sort((a,b)=>toNum(a.price)-toNum(b.price)); break;
      case "price-desc": r.sort((a,b)=>toNum(b.price)-toNum(a.price)); break;
      case "date-asc":
        r.sort((a,b)=>new Date(a.next_payment||a.next_payment_date||"2100-01-01")-new Date(b.next_payment||b.next_payment_date||"2100-01-01"));
        break;
      case "date-desc":
        r.sort((a,b)=>new Date(b.next_payment||b.next_payment_date||"1900-01-01")-new Date(a.next_payment||a.next_payment_date||"1900-01-01"));
        break;
      default: break;
    }
    return r;
  };

  const activeSubs = useMemo(
    () => sortSubs(filterSubs(subs.filter((s) => s.active))),
    [subs, filterText, sortOption]
  );
  const inactiveSubs = useMemo(
    () => sortSubs(filterSubs(subs.filter((s) => !s.active))),
    [subs, filterText, sortOption]
  );

  /* suma wszystkich aktywnych (niezależnie od filtra) */
  const monthlyTotal = subs.filter(s=>s.active).reduce((acc, x)=> acc + toNum(x.price), 0);

  /* najbliższa płatność */
  const todayISO = useMemo(() => toISO(new Date()), []);
  const nextPayment = useMemo(() => {
    const valids = activeSubs.map(s => ({
      ...s,
      anchor: s.next_payment || s.next_payment_date || null
    })).filter(s => isISO(s.anchor));

    if (!valids.length) return null;

    const cand = valids.map(s => {
      const due = nextMonthlyDate(s.anchor);
      return due ? ({ ...s, due, days: daysBetween(todayISO, due) }) : null;
    }).filter(Boolean);

    cand.sort((a,b)=>a.due - b.due);
    return cand[0] || null;
  }, [activeSubs, todayISO]);

  /* limit – tylko z ustawień (UI usunięty) */
  const limitNum = toNum(limitVal);
  const overLimit = limitOn && limitNum > 0 && monthlyTotal > limitNum;

  const renderSub = (s) => {
    const isEditing = editingId === s.id;
    const dateLabel = s.next_payment || s.next_payment_date || "—";
    return (
      <div key={s.id} className="card row sub-row">
        <div className="sub-info">
          <div className="sub-name">{s.name}</div>
          {!isEditing ? (
            <div className="sub-meta">
              <span className="badge">{toNum(s.price).toFixed(2)} {currencySymbol}</span>
              <span className="muted"> — {dateLabel}</span>
            </div>
          ) : (
            <div className="edit-inline">
              <input
                type="number"
                step="0.01"
                className="input sm"
                value={editingPrice}
                onChange={(e)=>setEditingPrice(e.target.value)}
              />
              <input
                type="date"
                className="input sm"
                value={editingDate}
                onChange={(e)=>setEditingDate(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="sub-actions">
          {!isEditing ? (
            <>
              <button
                className={s.active ? "btn btn-amber" : "btn btn-green"}
                onClick={() => handleToggleActive(s.id, s.active)}
              >
                {s.active ? "Dezaktywuj" : "Aktywuj"}
              </button>
              <button className="btn btn-sky" onClick={() => startEditing(s)}>Edytuj</button>
              <button className="btn btn-rose" onClick={() => handleDelete(s.id)}>Usuń</button>
            </>
          ) : (
            <>
              <button className="btn btn-green" onClick={() => saveEdit(s.id)}>Zapisz</button>
              <button className="btn" onClick={cancelEdit}>Anuluj</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* dodawanie */}
      <section className="card stack gap">
        <h2>Panel Subskrypcji</h2>
        <div className="grid-3 gap">
          <input
            ref={addNameRef}
            type="text"
            className="input"
            placeholder="Nazwa (np. Spotify)"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder="Cena"
            value={price}
            onChange={(e)=>setPrice(e.target.value)}
          />
          <div className="row">
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e)=>setDate(e.target.value)}
            />
            <button className="btn btn-green" onClick={handleAdd}>Dodaj</button>
          </div>
        </div>
      </section>

      {/* layout 2-kolumnowy */}
      <div className="grid-2 gap mt">
        {/* lewa kolumna */}
        <section className="card stack gap">
          <h3>Podsumowanie</h3>

          <div className={`stat ${overLimit ? "danger" : ""}`}>
            <div className="stat-label">Suma aktywnych</div>
            <div className="stat-value">
              {monthlyTotal.toFixed(2)} {currencySymbol} / miesiąc
              {limitOn && limitNum > 0 && (
                <span className="stat-cap"> (limit: {limitNum.toFixed(2)} {currencySymbol})</span>
              )}
            </div>
          </div>

          <div className="card inner">
            <div className="row center between">
              <div className="title-4">Najbliższa płatność</div>
            </div>
            {nextPayment ? (
              <div className={`next-pay ${nextPayment.days <= 7 ? "soon" : ""}`}>
                <div className="bold">{nextPayment.name}</div>
                <div className="muted">
                  {toNum(nextPayment.price).toFixed(2)} {currencySymbol} — {toISO(nextPayment.due)} (
                  {nextPayment.days === 0 ? "Dzisiaj" : `za ${nextPayment.days} dni`})
                </div>
              </div>
            ) : (
              <div className="muted">Brak nadchodzących płatności.</div>
            )}
          </div>
        </section>

        {/* prawa kolumna */}
        <section className="stack gap">
          <div className="row gap">
            <input
              type="text"
              className="input"
              placeholder="Filtruj nazwę…"
              value={filterText}
              onChange={(e)=>setFilterText(e.target.value)}
            />
            <select className="input" value={sortOption} onChange={(e)=>setSortOption(e.target.value)}>
              <option value="name-asc">Nazwa A–Z</option>
              <option value="name-desc">Nazwa Z–A</option>
              <option value="price-asc">Cena rosnąco</option>
              <option value="price-desc">Cena malejąco</option>
              <option value="date-asc">Data rosnąco</option>
              <option value="date-desc">Data malejąco</option>
            </select>
          </div>

          <div className="card stack gap">
            <h3>✅ Aktywne Subskrypcje</h3>
            {activeSubs.length ? activeSubs.map(renderSub) : (
              <div className="muted">Brak aktywnych subskrypcji.</div>
            )}
          </div>

          <div className="card stack gap">
            <h3>❌ Nieaktywne Subskrypcje</h3>
            {inactiveSubs.length ? inactiveSubs.map(renderSub) : (
              <div className="muted">Brak nieaktywnych subskrypcji.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
