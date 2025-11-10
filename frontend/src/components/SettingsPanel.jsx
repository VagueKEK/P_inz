// src/components/SettingsPanel.jsx
import { useEffect, useMemo, useState } from "react";
import useNbpRates, { convert } from "../hooks/useNbpRates";

// klucze w localStorage — spójne z wcześniejszymi
const LS = {
  LIMIT_ON: "limit_on",
  LIMIT_VAL: "limit_val",
  CURR_CODE: "currency_code",
  CURR_SYM: "currency_symbol",
};

const currencies = [
  { code: "PLN", symbol: "zł", label: "PLN — złoty" },
  { code: "EUR", symbol: "€",  label: "EUR — euro" },
  { code: "USD", symbol: "$",  label: "USD — dolar" },
  { code: "GBP", symbol: "£",  label: "GBP — funt" },
];

const toNum = (x) => {
  const n = parseFloat(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function SettingsPanel() {
  // wczytaj ustawienia
  const [limitOn, setLimitOn] = useState(() => localStorage.getItem(LS.LIMIT_ON) === "1");
  const [limitVal, setLimitVal] = useState(() => localStorage.getItem(LS.LIMIT_VAL) || "");
  const [code, setCode] = useState(() => localStorage.getItem(LS.CURR_CODE) || "PLN");
  const [symbol, setSymbol] = useState(() => localStorage.getItem(LS.CURR_SYM) || "zł");

  // NBP
  const { loading, error, map, date } = useNbpRates();

  // gdy zmieniasz kod waluty, ustaw domyślny symbol
  useEffect(() => {
    const found = currencies.find((c) => c.code === code);
    if (found && symbol === "") setSymbol(found.symbol);
  }, [code, symbol]);

  // auto-zapis do localStorage + broadcast
  useEffect(() => {
    localStorage.setItem(LS.LIMIT_ON, limitOn ? "1" : "0");
    window.dispatchEvent(new Event("app-settings-changed"));
  }, [limitOn]);

  useEffect(() => {
    localStorage.setItem(LS.LIMIT_VAL, String(limitVal));
    window.dispatchEvent(new Event("app-settings-changed"));
  }, [limitVal]);

  useEffect(() => {
    localStorage.setItem(LS.CURR_CODE, code);
    window.dispatchEvent(new Event("app-settings-changed"));
  }, [code]);

  useEffect(() => {
    localStorage.setItem(LS.CURR_SYM, symbol);
    window.dispatchEvent(new Event("app-settings-changed"));
  }, [symbol]);

  const preview = useMemo(() => {
    const n = toNum(limitVal);
    if (!limitOn || n <= 0) return "Limit wyłączony";
    return `Limit: ${n.toFixed(2)} ${symbol}`;
  }, [limitOn, limitVal, symbol]);

  // ---- PRZELICZNIK ----
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState(code);   // startowo: aktualnie ustawiona waluta
  const [to, setTo] = useState("EUR");      // domyślnie: EUR

  // gdy zmieni się ustawiona waluta — podmień 'from'
  useEffect(() => { setFrom(code); }, [code]);

  // lista walut do selektorów (z mapy NBP + PLN, posortowane)
  const allCodes = useMemo(() => {
    const set = new Set(Object.keys(map || {}));
    set.add("PLN");
    // preferowane na górze
    const fav = ["PLN", "EUR", "USD", "GBP"];
    const rest = [...set].filter((x) => !fav.includes(x)).sort();
    return [...fav.filter((x) => set.has(x)), ...rest];
  }, [map]);

  const converted = useMemo(() => {
    return convert(toNum(amount), from, to, map || { PLN: 1 });
  }, [amount, from, to, map]);

  // szybkie widgety: USTAWIONA WALUTA → (EUR / USD / GBP / PLN)
  const quickTargets = ["EUR", "USD", "GBP", "PLN"].filter((x) => x !== from);
  const quickRows = quickTargets.map((t) => ({
    to: t,
    val: convert(1, from, t, map || { PLN: 1 }),
  }));

  return (
    <div className="stack gap">
      {/* Waluta + Limit */}
      <section className="card stack gap">
        <h2>Ustawienia</h2>
        <div className="grid-2 gap">
          {/* Waluta */}
          <div className="card inner stack gap">
            <h3>Waluta</h3>
            <label className="stack">
              <span className="muted">Kod waluty</span>
              <select
                className="input"
                value={code}
                onChange={(e) => {
                  const next = e.target.value;
                  setCode(next);
                  const f = currencies.find((c) => c.code === next);
                  if (f) setSymbol(f.symbol); // domyślny symbol
                }}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack">
              <span className="muted">Symbol waluty (możesz zmienić)</span>
              <input
                className="input"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="np. zł, €, $, £"
              />
            </label>
          </div>

          {/* Limit */}
          <div className="card inner stack gap">
            <h3>Limit wydatków</h3>
            <label className="row gap center">
              <input
                type="checkbox"
                checked={limitOn}
                onChange={(e) => setLimitOn(e.target.checked)}
              />
              Włącz miesięczny limit wydatków
            </label>
            <div className="row gap">
              <input
                className="input"
                type="text"
                inputMode="decimal"
                placeholder={`np. 500,00`}
                disabled={!limitOn}
                value={limitVal}
                onChange={(e) => setLimitVal(e.target.value)}
              />
              <div className="btn" style={{ pointerEvents: "none" }}>{symbol}</div>
            </div>
            <div className="muted">{preview}</div>
          </div>
        </div>
      </section>

      {/* Kursy NBP i przelicznik */}
      <section className="card stack gap">
        <h3>Kursy NBP i przelicznik</h3>

        {loading ? (
          <div className="muted">Ładowanie kursów NBP…</div>
        ) : error ? (
          <div className="stat danger">
            <div className="stat-label">Błąd pobierania</div>
            <div className="stat-value" style={{ fontSize: "1rem" }}>{String(error)}</div>
          </div>
        ) : (
          <>
            <div className="row gap">
              <label className="stack" style={{ minWidth: 160 }}>
                <span className="muted">Kwota</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="np. 100"
                />
              </label>
              <label className="stack">
                <span className="muted">Z waluty</span>
                <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
                  {allCodes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="stack">
                <span className="muted">Na walutę</span>
                <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
                  {allCodes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="stat">
              <div className="stat-label">Wynik</div>
              <div className="stat-value">
                {toNum(amount).toFixed(2)} {from} = {converted.toFixed(4)} {to}
              </div>
              <div className="muted">Tabela A NBP, data: {date || "—"}</div>
            </div>

            <div className="card inner">
              <div className="title-4" style={{ marginBottom: ".5rem" }}>
                Szybkie przeliczenia: 1 {from}
              </div>
              <div className="row gap">
                {quickRows.map((r) => (
                  <div key={r.to} className="stat" style={{ padding: ".4rem .6rem" }}>
                    <div className="stat-label">{from} → {r.to}</div>
                    <div className="stat-value">{r.val.toFixed(4)} {r.to}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="muted">
          NBP udostępnia kursy średnie (tabela A). PLN jest walutą bazową. Konwersje między
          walutami liczone są przez kurs krzyżowy.
        </div>
      </section>

      <section className="card">
        <h3>Jak to działa?</h3>
        <p className="muted">
          Wybrana waluta i limit zapisują się lokalnie. Panel i kalendarz automatycznie użyją symbolu
          waluty. Sekcja powyżej pobiera kursy z API NBP i umożliwia szybkie przeliczenia między
          walutami (również „USTAWIONA WALUTA → EUR/PLN/USD/GBP”).
        </p>
      </section>
    </div>
  );
}
