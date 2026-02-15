import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${API_ROOT}/api/subscriptions/`;
const getCurrencySymbol = () => localStorage.getItem("currency_symbol") || "zł";

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const toNum = (x) => {
  const n = parseFloat(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function addStep(cur, baseDay, stepMonths) {
  const y = cur.getFullYear();
  const m = cur.getMonth() + stepMonths;
  const ny = y + Math.floor(m / 12);
  const nm = m % 12;
  const nd = new Date(ny, nm, 1);
  const last = new Date(ny, nm + 1, 0).getDate();
  nd.setDate(Math.min(baseDay, last));
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function occurrencesFrom(anchorISO, period, startDate, untilDate) {
  if (!isISO(anchorISO)) return [];
  const anchor = new Date(anchorISO + "T00:00:00");
  anchor.setHours(0, 0, 0, 0);

  const baseDay = anchor.getDate();
  const step = period === "yearly" ? 12 : 1;

  let first = new Date(anchor);
  first.setHours(0, 0, 0, 0);

  while (first < startDate) {
    first = addStep(first, baseDay, step);
  }

  const out = [];
  let cur = first;

  while (cur <= untilDate) {
    out.push(new Date(cur));
    cur = addStep(cur, baseDay, step);
  }

  return out;
}

function nextOccurrence(anchorISO, period, today) {
  const hits = occurrencesFrom(anchorISO, period, today, new Date(today.getFullYear() + 2, 11, 31));
  return hits[0] || null;
}

export default function Calendar() {
  const [subs, setSubs] = useState([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const currency = getCurrencySymbol();

  useEffect(() => {
    axios
      .get(API_URL, { withCredentials: true })
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : data.results || [];
        setSubs(
          rows.map((r) => ({
            ...r,
            next_payment_date: r.next_payment ?? null,
            period: r.period || "monthly",
          }))
        );
      })
      .catch((e) => console.error(e));
  }, []);

  const monthStart = useMemo(() => {
    const d = new Date(month.getFullYear(), month.getMonth(), 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [month]);

  const monthEnd = useMemo(() => {
    const d = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [month]);

  const grid = useMemo(() => {
    const firstDow = (monthStart.getDay() + 6) % 7;
    const cells = [];
    const start = new Date(monthStart);
    start.setDate(start.getDate() - firstDow);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      cells.push(d);
    }
    return cells;
  }, [monthStart]);

  const activeSubs = useMemo(() => subs.filter((s) => s.active), [subs]);

  const eventsMap = useMemo(() => {
    const map = new Map();
    for (const s of activeSubs) {
      const occ = occurrencesFrom(s.next_payment_date, s.period, monthStart, monthEnd);
      for (const d of occ) {
        const key = iso(d);
        const arr = map.get(key) || [];
        arr.push({ id: s.id, name: s.name, price: toNum(s.price), period: s.period });
        map.set(key, arr);
      }
    }
    return map;
  }, [activeSubs, monthStart, monthEnd]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const todayISO = useMemo(() => iso(today), [today]);

  const nearestISO = useMemo(() => {
    let best = null;
    for (const s of activeSubs) {
      const hit = nextOccurrence(s.next_payment_date, s.period, today);
      if (!hit) continue;
      if (!best || hit < best) best = hit;
    }
    return best ? iso(best) : null;
  }, [activeSubs, today]);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });
    return fmt.format(monthStart);
  }, [monthStart]);

  const goPrev = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () => {
    const d = new Date();
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const upcoming = useMemo(() => {
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 30);

    const arr = [];
    for (const s of activeSubs) {
      const occ = occurrencesFrom(s.next_payment_date, s.period, today, horizon);
      for (const d of occ) {
        const diff = Math.ceil((d - today) / 86400000);
        arr.push({ id: s.id, name: s.name, price: toNum(s.price), date: new Date(d), inDays: diff, period: s.period });
      }
    }
    arr.sort((a, b) => a.date - b.date || a.name.localeCompare(b.name));
    return arr.slice(0, 15);
  }, [activeSubs, today]);

  return (
    <div className="stack gap">
      <div className="card row between center">
        <div className="row gap">
          <button className="btn" onClick={goPrev}>←</button>
          <button className="btn" onClick={goToday}>Dziś</button>
          <button className="btn" onClick={goNext}>→</button>
        </div>
        <h2 className="title-4" style={{ textTransform: "capitalize" }}>{monthLabel}</h2>
        <div />
      </div>

      <div className="cal-layout gap">
        <div className="card cal-main">
          <div className="cal-grid cal-head">
            {["Pn","Wt","Śr","Cz","Pt","So","Nd"].map((d) => (
              <div key={d} className="cal-head-cell muted">{d}</div>
            ))}
          </div>

          <div className="cal-grid">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === monthStart.getMonth();
              const k = iso(d);
              const items = eventsMap.get(k) || [];
              const sum = items.reduce((acc, x) => acc + x.price, 0);
              const isNearestHere = nearestISO && k === nearestISO && inMonth;
              const isTodayHere = k === todayISO && inMonth;

              return (
                <div
                  key={i}
                  className={`cal-cell ${inMonth ? "" : "cal-dim"} ${isNearestHere ? "cal-soon" : ""} ${isTodayHere ? "cal-today" : ""}`}
                  title={isNearestHere ? "Najbliższa płatność" : undefined}
                >
                  <div className="cal-day">{d.getDate()}</div>

                  {items.length > 0 && (
                    <div className="cal-events">
                      {items.slice(0,3).map((ev) => (
                        <div key={`${ev.id}-${ev.name}`} className="cal-pill">
                          {ev.name} — {ev.price.toFixed(2)} {currency}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="cal-more">+{items.length - 3} więcej</div>
                      )}
                      <div className="cal-sum">Suma: {sum.toFixed(2)} {currency}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card cal-sidebar">
          <h3>Nadchodzące (30 dni)</h3>
          {upcoming.length === 0 ? (
            <div className="muted">Brak płatności w horyzoncie.</div>
          ) : (
            <div className="stack gap">
              {upcoming.map((u, idx) => (
                <div
                  key={idx}
                  className={`row between cal-up ${nearestISO && iso(u.date) === nearestISO ? "cal-soon" : ""}`}
                >
                  <div className="stack">
                    <div className="bold">{u.name}</div>
                    <div className="muted">
                      {iso(u.date)} {u.inDays === 0 ? "(dzisiaj)" : `(za ${u.inDays} dni)`}
                    </div>
                  </div>
                  <div className="bold">{u.price.toFixed(2)} {currency}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
