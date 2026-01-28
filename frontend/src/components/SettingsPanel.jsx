import { useEffect, useMemo, useRef, useState } from "react";
import useNbpRates, { convert } from "../hooks/useNbpRates";
import useAppSettings from "../hooks/useAppSettings";

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
  const { loading: settingsLoading, saving, error: settingsError, currencyCode, currencySymbol, limitOn, limitVal, saveSettings } = useAppSettings();

  const [code, setCode] = useState(currencyCode || "PLN");
  const [symbol, setSymbol] = useState(currencySymbol || "zł");
  const [limitOnLocal, setLimitOnLocal] = useState(!!limitOn);
  const [limitValLocal, setLimitValLocal] = useState(String(limitVal ?? ""));

  const symTimer = useRef(null);
  const limTimer = useRef(null);

  useEffect(() => { setCode(currencyCode || "PLN"); }, [currencyCode]);
  useEffect(() => { setSymbol(currencySymbol || "zł"); }, [currencySymbol]);
  useEffect(() => { setLimitOnLocal(!!limitOn); }, [limitOn]);
  useEffect(() => { setLimitValLocal(String(limitVal ?? "")); }, [limitVal]);

  const { loading, error, map, date } = useNbpRates();

  const preview = useMemo(() => {
    const n = toNum(limitValLocal);
    if (!limitOnLocal || n <= 0) return "Limit wyłączony";
    return `Limit: ${n.toFixed(2)} ${symbol}`;
  }, [limitOnLocal, limitValLocal, symbol]);

  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState(code);
  const [to, setTo] = useState("EUR");

  useEffect(() => { setFrom(code); }, [code]);

  const allCodes = useMemo(() => {
    const set = new Set(Object.keys(map || {}));
    set.add("PLN");
    const fav = ["PLN", "EUR", "USD", "GBP"];
    const rest = [...set].filter((x) => !fav.includes(x)).sort();
    return [...fav.filter((x) => set.has(x)), ...rest];
  }, [map]);

  const converted = useMemo(() => {
    return convert(toNum(amount), from, to, map || { PLN: 1 });
  }, [amount, from, to, map]);

  const quickTargets = ["EUR", "USD", "GBP", "PLN"].filter((x) => x !== from);
  const quickRows = quickTargets.map((t) => ({
    to: t,
    val: convert(1, from, t, map || { PLN: 1 }),
  }));

  const onToggleLimit = async (checked) => {
    setLimitOnLocal(checked);
    await saveSettings({ limit_on: checked });
  };

  const onChangeLimitVal = (v) => {
    setLimitValLocal(v);
    if (limTimer.current) clearTimeout(limTimer.current);
    limTimer.current = setTimeout(() => {
      const raw = String(v ?? "").replace(",", ".").trim();
      const num = raw === "" ? 0 : toNum(raw);
      saveSettings({ limit_val: num.toFixed(2) }).catch(() => {});
    }, 350);
  };

  const onChangeSymbol = (v) => {
    setSymbol(v);
    if (symTimer.current) clearTimeout(symTimer.current);
    symTimer.current = setTimeout(() => {
      saveSettings({ currency_symbol: String(v ?? "") }).catch(() => {});
    }, 350);
  };

  const onChangeCode = async (next) => {
    setCode(next);
    const f = currencies.find((c) => c.code === next);
    const nextSym = f ? f.symbol : symbol;
    setSymbol(nextSym);
    await saveSettings({ currency_code: next, currency_symbol: nextSym });
  };

  return (
    <div className="stack gap">
      <section className="card stack gap">
        <h2>Ustawienia</h2>

        {settingsLoading ? (
          <div className="muted">Ładowanie…</div>
        ) : (
          <>
            {settingsError ? <div className="muted">{String(settingsError)}</div> : null}
            {saving ? <div className="muted">Zapisywanie…</div> : null}

            <div className="grid-2 gap">
              <div className="card inner stack gap">
                <h3>Waluta</h3>
                <label className="stack">
                  <span className="muted">Kod waluty</span>
                  <select
                    className="input"
                    value={code}
                    onChange={(e) => onChangeCode(e.target.value)}
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="stack">
                  <span className="muted">Symbol waluty</span>
                  <input
                    className="input"
                    value={symbol}
                    onChange={(e) => onChangeSymbol(e.target.value)}
                    placeholder="np. zł, €, $, £"
                  />
                </label>
              </div>

              <div className="card inner stack gap">
                <h3>Limit wydatków</h3>
                <label className="row gap center">
                  <input
                    type="checkbox"
                    checked={limitOnLocal}
                    onChange={(e) => onToggleLimit(e.target.checked)}
                  />
                  Włącz miesięczny limit wydatków
                </label>
                <div className="row gap">
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    placeholder="np. 500,00"
                    disabled={!limitOnLocal}
                    value={limitValLocal}
                    onChange={(e) => onChangeLimitVal(e.target.value)}
                  />
                  <div className="btn" style={{ pointerEvents: "none" }}>{symbol}</div>
                </div>
                <div className="muted">{preview}</div>
              </div>
            </div>
          </>
        )}
      </section>

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
