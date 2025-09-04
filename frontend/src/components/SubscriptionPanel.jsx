// src/components/SubscriptionPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_ROOT = "http://localhost:8000";
const API_URL = `${API_ROOT}/api/subscriptions/`;
const CSRF_URL = `${API_ROOT}/api/csrf/`;

/* ---------- axios + CSRF ---------- */
function getCookie(name) {
  const all = document.cookie ? document.cookie.split("; ") : [];
  for (const entry of all) {
    const idx = entry.indexOf("=");
    const k = idx > -1 ? entry.slice(0, idx) : entry;
    const v = idx > -1 ? entry.slice(idx + 1) : "";
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

const http = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  headers: { Accept: "application/json" },
});
http.interceptors.request.use((config) => {
  const unsafe = !/^(GET|HEAD|OPTIONS|TRACE)$/i.test(config.method || "GET");
  if (unsafe) {
    const token = getCookie("csrftoken");
    if (token) config.headers["X-CSRFToken"] = token;
  }
  return config;
});

/* ---------- helpers ---------- */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const toISO = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};
const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const s = (x) => (x ?? "").toString();
const cleanPrice = (x) => s(x).replace(",", ".").trim();
// liczba bezpiecznie (łapie przecinek, NaN -> 0)
const toNum = (x) => {
  const n = parseFloat(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const daysBetween = (a, b) => {
  const d1 = new Date(a); d1.setHours(0,0,0,0);
  const d2 = new Date(b); d2.setHours(0,0,0,0);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};
const nextMonthlyDate = (anchor /* yyyy-mm-dd */) => {
  if (!isISO(anchor)) return null;
  const a = new Date(anchor);
  const t = new Date(); t.setHours(0,0,0,0);
  if (a >= t) return a;
  const baseDay = a.getDate();
  let m = a.getMonth(), y = a.getFullYear();
  let candidate = new Date(a);
  while (candidate < t) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    const nd = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    nd.setDate(Math.min(baseDay, lastDay));
    candidate = nd;
  }
  return candidate;
};

/* ---------- ACCESSIBILITY (dock) ---------- */
function useAccessibility() {
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("ui_high_contrast") === "1");
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem("ui_font_scale") || 1));

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", `${fontScale}`);
    localStorage.setItem("ui_font_scale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle("hc", highContrast);
    localStorage.setItem("ui_high_contrast", highContrast ? "1" : "0");

    const wipe = document.createElement("div");
    wipe.className = "hc-wipe";
    document.body.appendChild(wipe);
    requestAnimationFrame(() => wipe.classList.add("run"));
    const t = setTimeout(() => wipe.remove(), 700);
    return () => clearTimeout(t);
  }, [highContrast]);

  const inc = () => setFontScale((s) => Math.min(2, +(s + 0.1).toFixed(2)));
  const dec = () => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)));
  const reset = () => setFontScale(1);
  const toggleContrast = () => setHighContrast((v) => !v);

  const speakSelection = () => {
    const txt = window.getSelection?.().toString().trim();
    if (!txt) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "pl-PL";
    window.speechSynthesis.speak(u);
  };

  return { highContrast, inc, dec, reset, toggleContrast, speakSelection };
}

function A11yDock({ a11y }) {
  if (!a11y.highContrast) return null;
  return (
    <div className="a11y-dock">
      <button className="btn btn-sky" onClick={a11y.inc}>A+</button>
      <button className="btn btn-sky" onClick={a11y.dec}>A−</button>
      <button className="btn" onClick={a11y.reset}>Reset</button>
      <button className="btn btn-green" onClick={a11y.speakSelection}>Czytaj</button>
    </div>
  );
}

/* ---------- MAIN ---------- */
export default function SubscriptionPanel() {
  const a11y = useAccessibility();

  const [subs, setSubs] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [editingDate, setEditingDate] = useState("");

  const [filterText, setFilterText] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");

  const [limitOn, setLimitOn] = useState(() => localStorage.getItem("limit_on") === "1");
  const [limitValue, setLimitValue] = useState(() => localStorage.getItem("limit_val") || "");

  const addNameRef = useRef(null);

  /* ---- load ---- */
  const fetchSubs = async () => {
    const res = await http.get(API_URL);
    const rows = Array.isArray(res.data) ? res.data : res.data.results || [];
    setSubs(rows.map((r) => ({ ...r, next_payment_date: r.next_payment ?? null })));
  };
  useEffect(() => { http.get(CSRF_URL).finally(fetchSubs); }, []);

  /* ---- persist limit ---- */
  useEffect(() => { localStorage.setItem("limit_on", limitOn ? "1" : "0"); }, [limitOn]);
  useEffect(() => { localStorage.setItem("limit_val", String(limitValue)); }, [limitValue]);

  /* ---- mutations ---- */
  const handleAdd = async () => {
    if (!name.trim() || !price || !date) return;
    await http.post(API_URL, {
      name: name.trim(),
      price: cleanPrice(price) || "0",
      next_payment: isISO(date) ? date : null, // backend field
      active: true,
    });
    setName(""); setPrice(""); setDate("");
    await fetchSubs();
    addNameRef.current?.focus();
  };

  const handleDelete = async (id) => {
    await http.delete(`${API_URL}${id}/`);
    fetchSubs();
  };

  const handleToggleActive = async (id, active) => {
    await http.patch(`${API_URL}${id}/`, { active: !active });
    fetchSubs();
  };

  const startEditing = (s) => {
    setEditingId(s.id);
    setEditingPrice(s.price?.toString() ?? "");
    setEditingDate(isISO(s.next_payment_date) ? s.next_payment_date : "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingPrice("");
    setEditingDate("");
  };
  const saveEdit = async (id) => {
    await http.patch(`${API_URL}${id}/`, {
      price: cleanPrice(editingPrice),
      next_payment: isISO(editingDate) ? editingDate : null, // backend field
    });
    cancelEdit();
    fetchSubs();
  };

  /* ---- lists, sort/filter ---- */
  const filterSubs = (arr) =>
    arr.filter((s) => s.name.toLowerCase().includes(filterText.toLowerCase()));

  const sortSubs = (arr) => {
    const r = [...arr];
    switch (sortOption) {
      case "name-asc": r.sort((a,b)=>a.name.localeCompare(b.name)); break;
      case "name-desc": r.sort((a,b)=>b.name.localeCompare(a.name)); break;
      case "price-asc": r.sort((a,b)=>toNum(a.price)-toNum(b.price)); break;
      case "price-desc": r.sort((a,b)=>toNum(b.price)-toNum(a.price)); break;
      case "date-asc": r.sort((a,b)=>new Date(a.next_payment_date || "2100-01-01")-new Date(b.next_payment_date || "2100-01-01")); break;
      case "date-desc": r.sort((a,b)=>new Date(b.next_payment_date || "1900-01-01")-new Date(a.next_payment_date || "1900-01-01")); break;
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

  // *** SUMA: po WSZYSTKICH aktywnych, nie po przefiltrowanych
  const monthlyTotal = subs
    .filter((s) => s.active)
    .reduce((acc, x) => acc + toNum(x.price), 0);

  /* ---- next payment summary ---- */
  const todayISO = useMemo(() => toISO(new Date()), []);
  const nextPayment = useMemo(() => {
    const valids = activeSubs.filter((s) => isISO(s.next_payment_date));
    if (!valids.length) return null;
    const candidates = valids.map((s) => {
      const due = nextMonthlyDate(s.next_payment_date);
      return due ? { ...s, due, days: daysBetween(todayISO, due) } : null;
    }).filter(Boolean);
    candidates.sort((a, b) => a.due - b.due);
    return candidates[0] || null;
  }, [activeSubs, todayISO]);

  /* ---- limit ---- */
  const limitNum = toNum(limitValue);
  const overLimit = limitOn && limitNum > 0 && monthlyTotal > limitNum;

  /* ---- render ---- */
  const renderSub = (s) => {
    const isEditing = editingId === s.id;

    return (
      <div key={s.id} className="card row sub-row">
        <div className="sub-info">
          <div className="sub-name">{s.name}</div>
          {!isEditing ? (
            <div className="sub-meta">
              <span className="badge">{toNum(s.price).toFixed(2)} zł</span>
              <span className="muted"> — {s.next_payment_date || "—"}</span>
            </div>
          ) : (
            <div className="edit-inline">
              <input
                type="number"
                step="0.01"
                className="input sm"
                value={editingPrice}
                onChange={(e) => setEditingPrice(e.target.value)}
              />
              <input
                type="date"
                className="input sm"
                value={editingDate}
                onChange={(e) => setEditingDate(e.target.value)}
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
              <button className="btn btn-sky" onClick={() => startEditing(s)}>
                Edytuj
              </button>
              <button className="btn btn-rose" onClick={() => handleDelete(s.id)}>
                Usuń
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-green" onClick={() => saveEdit(s.id)}>
                Zapisz
              </button>
              <button className="btn" onClick={cancelEdit}>Anuluj</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <A11yDock a11y={a11y} />

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
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder="Cena"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <div className="row">
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              {monthlyTotal.toFixed(2)} zł / miesiąc
              {limitOn && limitNum > 0 && (
                <span className="stat-cap"> (limit: {limitNum.toFixed(2)} zł)</span>
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
                  {toNum(nextPayment.price).toFixed(2)} zł — {toISO(nextPayment.due)} (
                  {nextPayment.days === 0 ? "Dzisiaj" : `za ${nextPayment.days} dni`})
                </div>
              </div>
            ) : (
              <div className="muted">Brak nadchodzących płatności.</div>
            )}
          </div>

          <div className="card inner">
            <label className="row gap center">
              <input
                type="checkbox"
                checked={limitOn}
                onChange={(e) => setLimitOn(e.target.checked)}
              />
              Włącz limit miesięcznych wydatków
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="np. 500 lub 500,00"
              disabled={!limitOn}
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
            />
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
              onChange={(e) => setFilterText(e.target.value)}
            />
            <select
              className="input"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="name-asc">Nazwa A–Z</option>
              <option value="name-desc">Nazwa Z–A</option>
              <option value="price-asc">Cena rosnąco</option>
              <option value="price-desc">Cena malejąco</option>
              <option value="date-asc">Data rosnąco</option>
              <option value="date-desc">Data malejąco</option>
            </select>
          </div>

          <div className="card stack gap">
            <h3>🔥 Aktywne Subskrypcje</h3>
            {activeSubs.length ? activeSubs.map(renderSub) : (
              <div className="muted">Brak aktywnych subskrypcji.</div>
            )}
          </div>

          <div className="card stack gap">
            <h3>📦 Nieaktywne Subskrypcje</h3>
            {inactiveSubs.length ? inactiveSubs.map(renderSub) : (
              <div className="muted">Brak nieaktywnych subskrypcji.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
