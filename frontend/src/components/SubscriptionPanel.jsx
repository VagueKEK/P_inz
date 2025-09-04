import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000/api/subscriptions/";

/* ---------- helpers ---------- */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const toISO = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};
const daysBetween = (a, b) => {
  const d1 = new Date(a); d1.setHours(0,0,0,0);
  const d2 = new Date(b); d2.setHours(0,0,0,0);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};
const nextMonthlyDate = (anchor /* yyyy-mm-dd */) => {
  const a = new Date(anchor);
  const t = new Date(); t.setHours(0,0,0,0);

  // jeśli anchor w przyszłości → to on jest najbliższy
  if (a >= t) return a;

  // w przeciwnym razie dodajemy miesiące aż przekroczymy "dziś"
  const baseDay = a.getDate();
  let m = a.getMonth(), y = a.getFullYear();
  let candidate = new Date(a);
  while (candidate < t) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    // ustaw dzień z zachowaniem końca miesiąca
    const nd = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    nd.setDate(Math.min(baseDay, lastDay));
    candidate = nd;
  }
  return candidate;
};

/* ---------- ACCESSIBILITY (dock) ---------- */
function useAccessibility() {
  const [highContrast, setHighContrast] = useState(() => {
    const v = localStorage.getItem("ui_high_contrast");
    return v === "1";
  });
  const [fontScale, setFontScale] = useState(() => {
    const v = localStorage.getItem("ui_font_scale");
    return v ? Number(v) : 1;
  });

  // apply to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty("--font-scale", `${fontScale}`);
    localStorage.setItem("ui_font_scale", String(fontScale));
  }, [fontScale]);

  // high contrast + wipe animation
  useEffect(() => {
    const body = document.body;
    if (highContrast) body.classList.add("hc");
    else body.classList.remove("hc");
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

  // Web Speech API
  const speakSelection = () => {
    const s = window.getSelection?.().toString().trim();
    if (!s) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(s);
    u.lang = "pl-PL";
    window.speechSynthesis.speak(u);
  };

  return { highContrast, fontScale, inc, dec, reset, toggleContrast, speakSelection };
}

function A11yDock({ a11y }) {
  if (!a11y.highContrast) return null; // narzędzia tylko w trybie dostępności
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
    const res = await axios.get(API_URL);
    setSubs(res.data || []);
  };
  useEffect(() => { fetchSubs(); }, []);

  /* ---- persist limit ---- */
  useEffect(() => { localStorage.setItem("limit_on", limitOn ? "1" : "0"); }, [limitOn]);
  useEffect(() => { localStorage.setItem("limit_val", limitValue); }, [limitValue]);

  /* ---- mutations ---- */
  const handleAdd = async () => {
    if (!name.trim() || !price || !date) return;
    await axios.post(API_URL, {
      name: name.trim(),
      price,
      next_payment_date: date,
      active: true,
    });
    setName(""); setPrice(""); setDate("");
    await fetchSubs();
    addNameRef.current?.focus();
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_URL}${id}/`);
    fetchSubs();
  };

  const handleToggleActive = async (id, active) => {
    await axios.patch(`${API_URL}${id}/`, { active: !active });
    fetchSubs();
  };

  const startEditing = (s) => {
    setEditingId(s.id);
    setEditingPrice(s.price);
    setEditingDate(s.next_payment_date);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingPrice("");
    setEditingDate("");
  };
  const saveEdit = async (id) => {
    await axios.patch(`${API_URL}${id}/`, {
      price: editingPrice,
      next_payment_date: editingDate,
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
      case "price-asc": r.sort((a,b)=>parseFloat(a.price)-parseFloat(b.price)); break;
      case "price-desc": r.sort((a,b)=>parseFloat(b.price)-parseFloat(a.price)); break;
      case "date-asc": r.sort((a,b)=>new Date(a.next_payment_date)-new Date(b.next_payment_date)); break;
      case "date-desc": r.sort((a,b)=>new Date(b.next_payment_date)-new Date(a.next_payment_date)); break;
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

  const monthlyTotal = activeSubs.reduce((acc, s) => acc + Number(s.price || 0), 0);

  /* ---- next payment summary ---- */
  const todayISO = useMemo(() => toISO(new Date()), []);
  const nextPayment = useMemo(() => {
    if (!activeSubs.length) return null;
    const candidates = activeSubs.map((s) => {
      const anchor = s.next_payment_date;
      const due = nextMonthlyDate(anchor);
      return { ...s, due, days: daysBetween(todayISO, due) };
    });
    candidates.sort((a, b) => a.due - b.due);
    return candidates[0];
  }, [activeSubs, todayISO]);

  /* ---- render ---- */
  const renderSub = (s) => {
    const isEditing = editingId === s.id;

    return (
      <div key={s.id} className="card row sub-row">
        <div className="sub-info">
          <div className="sub-name">{s.name}</div>
          {!isEditing ? (
            <div className="sub-meta">
              <span className="badge">{Number(s.price).toFixed(2)} zł</span>
              <span className="muted"> — {s.next_payment_date}</span>
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

  /* limit kolor */
  const overLimit =
    limitOn && limitValue && Number(limitValue) > 0 && monthlyTotal > Number(limitValue);

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
              {overLimit && <span className="stat-cap"> (limit: {Number(limitValue).toFixed(2)} zł)</span>}
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
                  {Number(nextPayment.price).toFixed(2)} zł — {toISO(nextPayment.due)} (
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
              type="number"
              className="input"
              placeholder="np. 500"
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
