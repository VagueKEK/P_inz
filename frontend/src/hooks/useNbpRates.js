// src/hooks/useNbpRates.js
import { useEffect, useState } from "react";

// NBP: tabela A (kursy średnie) — PLN jako waluta bazowa
const URL = "https://api.nbp.pl/api/exchangerates/tables/A?format=json";
const LS_KEY = "nbp_rates_v1";
const CACHE_MS = 12 * 60 * 60 * 1000; // 12h

export default function useNbpRates() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { loading: true, error: null, map: { PLN: 1 }, date: null };
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > CACHE_MS) {
        return { loading: true, error: null, map: { PLN: 1 }, date: null };
      }
      return { loading: false, error: null, map: parsed.map, date: parsed.date };
    } catch {
      return { loading: true, error: null, map: { PLN: 1 }, date: null };
    }
  });

  useEffect(() => {
    if (!state.loading) return;
    (async () => {
      try {
        const res = await fetch(URL, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("NBP HTTP " + res.status);
        const json = await res.json(); // [{ table:'A', effectiveDate, rates:[{code,mid}, ...]}]
        const table = Array.isArray(json) ? json[0] : null;
        const map = { PLN: 1 };
        if (table && Array.isArray(table.rates)) {
          table.rates.forEach((r) => {
            if (r?.code && typeof r.mid === "number") map[r.code] = r.mid;
          });
        }
        const payload = { ts: Date.now(), map, date: table?.effectiveDate || null };
        localStorage.setItem(LS_KEY, JSON.stringify(payload));
        setState({ loading: false, error: null, map, date: payload.date });
      } catch (e) {
        setState((s) => ({ ...s, loading: false, error: e?.message || "NBP error" }));
      }
    })();
  }, [state.loading]);

  return state; // { loading, error, map:{CODE->PLN mid}, date }
}

// Konwersja: kwota w 'from' na 'to' przy mapie NBP (PLN-bazowej)
export function convert(amount, fromCode, toCode, map) {
  const a = Number(amount) || 0;
  const from = map[fromCode] ?? null; // PLN per 1 'from'
  const to = map[toCode] ?? null;     // PLN per 1 'to'
  if (!from || !to) return 0;
  // a [from] * (PLN/from) / (PLN/to) = a * (from / to) [to]
  return a * (from / to);
}
