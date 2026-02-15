// src/components/SummaryPanel.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import useAppSettings from "../hooks/useAppSettings";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${API_BASE}/api/subscriptions/`;

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const toNum = (x) => {
  const n = parseFloat(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function addStep(cur, baseDay, stepMonths) {
  const y = cur.getFullYear();
  const m = cur.getMonth() + stepMonths;
  const ny = y + Math.floor(m / 12);
  const nm = ((m % 12) + 12) % 12;
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

  const step = period === "yearly" ? 12 : 1;
  const baseDay = anchor.getDate();

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

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function colorFromKey(key) {
  const h = hash32(String(key));
  const hue = h % 360;
  return `hsl(${hue} 75% 55%)`;
}

function Tip({ tip }) {
  if (!tip) return null;
  return createPortal(
    <div
      className="chart-tooltip-fixed"
      style={{
        left: tip.x,
        top: tip.y,
        transform: "translate(-50%, calc(-100% - 12px))",
      }}
    >
      <div className="chart-tooltip-title">{tip.title}</div>
      <div className="chart-tooltip-value">{tip.value}</div>
    </div>,
    document.body
  );
}

function BarChart({ data, height = 260, currency = "", highlightMax = false }) {
  const maxVal = Math.max(0, ...data.map((d) => d.value));
  const maxIndex = useMemo(() => {
    let bestI = -1;
    let bestV = -Infinity;
    for (let i = 0; i < data.length; i++) {
      const v = data[i]?.value ?? 0;
      if (v > bestV) {
        bestV = v;
        bestI = i;
      }
    }
    return bestI;
  }, [data]);

  const barW = 48;
  const gap = 26;
  const width = data.length * (barW + gap) + gap;

  const [tip, setTip] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const close = () => {
      setTip(null);
      setSelectedKey(null);
    };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close, true);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close, true);
    };
  }, []);

  const onBarPointerDown = (e, d) => {
    e.preventDefault();
    e.stopPropagation();

    const key = String(d.id ?? d.full ?? d.label);
    setSelectedKey(key);
    setAnimKey((k) => k + 1);

    setTip({
      x: e.clientX,
      y: e.clientY,
      title: d.full || d.label || "—",
      value: `${d.value.toFixed(2)} ${currency}`.trim(),
    });
  };

  return (
    <div className="chart-scroll" onPointerDown={(e) => e.stopPropagation()}>
      <Tip tip={tip} />

      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: "block" }}>
        <line x1="0" y1={height - 34} x2={width} y2={height - 34} stroke="rgba(255,255,255,.15)" />

        {data.map((d, i) => {
          const x = gap + i * (barW + gap);
          const h = maxVal > 0 ? Math.round((d.value / maxVal) * (height - 82)) : 0;
          const y = height - 34 - h;

          const key = String(d.id ?? d.full ?? d.label ?? i);
          const isSelected = selectedKey === key;
          const isMax = highlightMax && maxVal > 0 && i === maxIndex;

          const fill = colorFromKey(d.full || d.label || key);
          const xCenter = x + barW / 2;

          const rectClass = [
            "chart-bar-rect",
            isMax ? "chart-bar-rect--max" : "",
            isSelected ? "chart-bar-rect--selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <g key={key} style={{ cursor: "pointer" }} onPointerDown={(e) => onBarPointerDown(e, d)}>
              <rect x={x} y={y} width={barW} height={h} rx="12" className={rectClass} style={{ fill }} />

              {isSelected && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx="12"
                  className="chart-bar-click-anim"
                  style={{ fill }}
                  key={`anim-${key}-${animKey}`}
                  pointerEvents="none"
                />
              )}

              <text x={xCenter} y={y - 8} textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.9">
                {d.value.toFixed(2)} {currency}
              </text>

              <text x={xCenter} y={height - 12} textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.75">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function SummaryPanel() {
  const { currencySymbol } = useAppSettings();

  const [subs, setSubs] = useState([]);
  const [mode, setMode] = useState("year");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthISO, setMonthISO] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);

  useEffect(() => {
    axios
      .get(API_URL, { withCredentials: true })
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : data.results || [];
        setSubs(
          rows.map((r) => ({
            ...r,
            price: toNum(r.price),
            anchor: r.next_payment ?? r.next_payment_date ?? null,
            period: r.period || "monthly",
          }))
        );
      })
      .catch(() => setSubs([]));
  }, []);

  const activeSubs = useMemo(() => subs.filter((s) => s.active), [subs]);

  const yearData = useMemo(() => {
    if (mode !== "year") return [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const months = Array.from({ length: 12 }, (_, m) => ({
      id: `${year}-${pad2(m + 1)}`,
      key: `${year}-${pad2(m + 1)}`,
      label: new Intl.DateTimeFormat("pl-PL", { month: "short" }).format(new Date(year, m, 1)),
      value: 0,
      full: new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(year, m, 1)),
    }));

    for (const s of activeSubs) {
      const occ = occurrencesFrom(s.anchor, s.period, start, end);
      for (const d of occ) {
        const k = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
        const idx = months.findIndex((x) => x.key === k);
        if (idx >= 0) months[idx].value += s.price;
      }
    }

    return months;
  }, [activeSubs, mode, year]);

  const monthData = useMemo(() => {
    if (mode !== "month") return [];
    const [y, m] = monthISO.split("-").map((n) => parseInt(n, 10));
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const map = new Map();

    for (const s of activeSubs) {
      const occ = occurrencesFrom(s.anchor, s.period, start, end);
      if (occ.length) map.set(s.name, (map.get(s.name) || 0) + s.price * occ.length);
    }

    let rows = Array.from(map.entries()).map(([name, val]) => ({
      id: name,
      label: name.length > 10 ? `${name.slice(0, 9)}…` : name,
      value: val,
      full: name,
    }));

    rows.sort((a, b) => b.value - a.value);
    rows = rows.slice(0, 10);

    return rows;
  }, [activeSubs, mode, monthISO]);

  const totalSelected = useMemo(() => {
    const arr = mode === "year" ? yearData : monthData;
    return arr.reduce((acc, r) => acc + r.value, 0);
  }, [mode, yearData, monthData]);

  const top5 = useMemo(() => {
    if (mode !== "month") return [];
    return [...monthData].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [mode, monthData]);

  return (
    <div className="stack gap">
      <section className="card stack gap">
        <h2>Podsumowanie</h2>

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
            <input className="input" type="month" value={monthISO} onChange={(e) => setMonthISO(e.target.value)} />
          )}
        </div>

        <div className="card inner">
          {mode === "year" ? (
            <>
              <h3>Wydatki w {year} r.</h3>
              <BarChart data={yearData} currency={currencySymbol} highlightMax={false} />
            </>
          ) : (
            <>
              <h3>
                Wydatki w{" "}
                {new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(monthISO + "-01"))}
              </h3>
              {monthData.length ? (
                <BarChart data={monthData} currency={currencySymbol} highlightMax={true} />
              ) : (
                <div className="muted">Brak płatności w tym miesiącu.</div>
              )}
            </>
          )}
        </div>

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
                  ? top5.map((t, i) => (
                      <div key={i}>
                        {t.full || t.label}: {t.value.toFixed(2)} {currencySymbol}
                      </div>
                    ))
                  : "—"}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
