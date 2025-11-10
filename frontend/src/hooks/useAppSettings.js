import { useEffect, useState } from "react";

const LS = {
  LIMIT_ON: "limit_on",
  LIMIT_VAL: "limit_val",
  CURR_CODE: "currency_code",
  CURR_SYM: "currency_symbol",
};

function load() {
  return {
    limitOn: localStorage.getItem(LS.LIMIT_ON) === "1",
    limitVal: localStorage.getItem(LS.LIMIT_VAL) || "",
    currencyCode: localStorage.getItem(LS.CURR_CODE) || "PLN",
    currencySymbol: localStorage.getItem(LS.CURR_SYM) || "zł",
  };
}

export default function useAppSettings() {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    const onChange = () => setSettings(load());
    window.addEventListener("storage", onChange);
    window.addEventListener("app-settings-changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("app-settings-changed", onChange);
    };
  }, []);

  return settings;
}