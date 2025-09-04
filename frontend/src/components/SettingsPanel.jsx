import { useState, useEffect } from "react";

export default function SettingsPanel() {
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [limitValue, setLimitValue] = useState("");
  const [currency, setCurrency] = useState("PLN");

  // Ładowanie ustawień z localStorage
  useEffect(() => {
    const savedLimitEnabled = localStorage.getItem("limitEnabled");
    const savedLimitValue = localStorage.getItem("limitValue");
    const savedCurrency = localStorage.getItem("currency");

    if (savedLimitEnabled === "true") setLimitEnabled(true);
    if (savedLimitValue) setLimitValue(savedLimitValue);
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  // Zapisywanie ustawień
  useEffect(() => {
    localStorage.setItem("limitEnabled", limitEnabled);
    localStorage.setItem("limitValue", limitValue);
    localStorage.setItem("currency", currency);
  }, [limitEnabled, limitValue, currency]);

  return (
    <div className="p-6 text-white">
      <h2 className="text-3xl font-bold mb-6">Ustawienia</h2>

      <div className="bg-gray-800 p-6 rounded shadow max-w-md">
        <label className="flex items-center space-x-2 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={limitEnabled}
            onChange={() => setLimitEnabled(!limitEnabled)}
            className="form-checkbox h-5 w-5 text-green-500"
          />
          <span>Włącz limit wydatków</span>
        </label>

        <input
          type="number"
          placeholder="Limit wydatków"
          disabled={!limitEnabled}
          value={limitValue}
          onChange={(e) => setLimitValue(e.target.value)}
          className={`w-full p-2 mb-6 rounded bg-gray-700 text-white ${
            !limitEnabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />

        <label className="block mb-2 font-semibold">Waluta</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        >
          <option value="PLN">PLN</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
    </div>
  );
}
