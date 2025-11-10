import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import useAppSettings from "../hooks/useAppSettings";

const API_URL = "http://localhost:8000/api/subscriptions/";

/* ---------- helpers (spójne z Calendar.jsx) ---------- */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const toNum = (x) => {
  const n = parseFloat(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function occurrencesFrom(anchorISO, startDate, untilDate) {
  if (!isISO(anchorISO)) return [];
  const anchor = new Date(anchorISO + "T00:00:00");
  const baseDay = anchor.getDate();

  let first = new Date(anchor);
  while (first < startDate) {
    const y = first.getFullYear();
    const m = first.getMonth() + 1;
    const ny = m > 11 ? y + 1 : y;
    const nm = m > 11 ? 0 : m;
    const nd = new Date(ny, nm, 1);
    const last = new Date(ny, nm + 1, 0).getDate();
    nd.setDate(Math.min(baseDay, last));
    first = nd;
  }

  const out = [];
  let cur = first;
  while (cur <= untilDate) {
    out.push(new Date(cur));
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const ny = m > 11 ? y + 1 : y;
    const nm = m > 11 ? 0 : m;
    const nd = new Date(ny, nm, 1);
    const last = new Date(ny, nm + 1, 0).getDate();
    nd.setDate(Math.min(baseDay, last));
    cur = nd;
  }
  return out;
}

/* ---------- mini chart (SVG, bez zależności) ---------- */
function BarChart({ data, height = 240, currency = "" }) {
  // data: [{ label, value }]
  const max = Math.max(0, ...data.map((d) => d.value));
  const barW = 36;
  const gap = 18;
  const width = data.length * (barW + gap) + gap;

  return (
    <div className="chart-scroll">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMax meet"
      >
        {/* oś X */}
        <line x1="0" y1={height - 28} x2={width} y2={height - 28} stroke="rgba(255,255,255,.15)" />

        {data.map((d, i) => {
          const x = gap + i * (barW + gap);
          const h = max > 0 ? Math.round(((d.value / max) * (height - 60))) : 0;
          const y = height - 28 - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="6"
                className="chart-bar"
              />
              {/* wartość nad słupkiem */}
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
                opacity="0.85"
              >
                {d.value.toFixed(2)} {currency}
              </text>
              {/* etykieta pod spodem */}
              <text
                x={x + barW / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
                opacity="0.75"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- główny komponent ---------- */
export default function SummaryPanel() {
  const { currencySymbol } = useAppSettings();

  const [subs, setSubs] = useState([]);
  const [mode, setMode] = useState("year"); // "year" | "month"

  // sterowanie okresem
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthISO, setMonthISO] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);

  useEffect(() => {
    axios.get(API_URL).then(({ data }) => {
      const rows = Array.isArray(data) ? data : data.results || [];
      setSubs(
        rows.map((r) => ({
          ...r,
          price: toNum(r.price),
          anchor: r.next_payment ?? r.next_payment_date ?? null,
        }))
      );
    });
  }, []);

  const activeSubs = useMemo(() => subs.filter((s) => s.active), [subs]);

  /* ------ agregacje ------ */

  // Rok: 12 słupków miesięcznych
  const yearData = useMemo(() => {
    if (mode !== "year") return [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const months = Array.from({ length: 12 }, (_, m) => ({
      key: `${year}-${pad2(m + 1)}`,
      label: new Intl.DateTimeFormat("pl-PL", { month: "short" }).format(new Date(year, m, 1)),
      value: 0,
    }));

    for (const s of activeSubs) {
      const occ = occurrencesFrom(s.anchor, start, end);
      for (const d of occ) {
        const k = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
        const i = months.findIndex((x) => x.key === k);
        if (i >= 0) months[i].value += s.price;
      }
    }
    return months;
  }, [activeSubs, mode, year]);

  // Miesiąc: słupki per usługa (tylko płatności w wybranym miesiącu)
  const monthData = useMemo(() => {
    if (mode !== "month") return [];
    const [y, m] = monthISO.split("-").map((n) => parseInt(n, 10));
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const map = new Map(); // name -> suma

    for (const s of activeSubs) {
      const occ = occurrencesFrom(s.anchor, start, end);
      if (occ.length) {
        map.set(s.name, (map.get(s.name) || 0) + s.price);
      }
    }
    const rows = Array.from(map.entries()).map(([name, val]) => ({
      label: name.length > 10 ? `${name.slice(0, 9)}…` : name,
      value: val,
      full: name,
    }));
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }, [activeSubs, mode, monthISO]);

  // sumy i topy
  const totalSelected = useMemo(() => {
    const arr = mode === "year" ? yearData : monthData;
    return arr.reduce((acc, r) => acc + r.value, 0);
  }, [mode, yearData, monthData]);

  const top5 = useMemo(() => {
    if (mode !== "month") return [];
    return [...monthData].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [mode, monthData]);

  /* ------ UI ------ */
  return (
    <div className="stack gap">
      <section className="card stack gap">
        <h2>Podsumowanie</h2>

        {/* przełącznik */}
        <div className="row gap">
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="year">Rocznie</option>
            <option value="month">Miesięcznie</option>
          </select>

          {mode === "year" ? (
            <input
              className="input"
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value || `${now.getFullYear()}`, 10))}
            />
          ) : (
            <input
              className="input"
              type="month"
              value={monthISO}
              onChange={(e) => setMonthISO(e.target.value)}
            />
          )}
        </div>

        {/* wykres */}
        <div className="card inner">
          {mode === "year" ? (
            <>
              <h3>Wydatki w {year} r.</h3>
              <BarChart data={yearData} currency={currencySymbol} />
            </>
          ) : (
            <>
              <h3>
                Wydatki w {new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" })
                  .format(new Date(monthISO + "-01"))}
              </h3>
              {monthData.length ? (
                <BarChart data={monthData} currency={currencySymbol} />
              ) : (
                <div className="muted">Brak płatności w tym miesiącu.</div>
              )}
            </>
          )}
        </div>

        {/* metryki */}
        <div className="grid-2 gap">
          <div className="stat">
            <div className="stat-label">Suma za wybrany okres</div>
            <div className="stat-value">
              {totalSelected.toFixed(2)} {currencySymbol}
            </div>
          </div>

          {mode === "year" ? (
            <div className="stat">
              <div className="stat-label">Średnio miesięcznie</div>
              <div className="stat-value">
                {(totalSelected / 12).toFixed(2)} {currencySymbol}
              </div>
            </div>
          ) : (
            <div className="stat">
              <div className="stat-label">TOP 5 (miesiąc)</div>
              <div className="stat-value" style={{ fontSize: "1rem", fontWeight: 700 }}>
                {top5.length
                  ? top5.map((t) => `${t.full || t.label}: ${t.value.toFixed(2)} ${currencySymbol}`).join("  •  ")
                  : "—"}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
