import { createContext, useCallback, useContext, useEffect, useState } from "react";

const A11yContext = createContext({ highContrast: false, toggleHighContrast: () => {} });

export function AccessibilityProvider({ children }) {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("a11y.highContrast");
    const initial = saved === "true";
    setHighContrast(initial);
    document.documentElement.classList.toggle("hc", initial);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => {
      const next = !prev;
      document.documentElement.classList.toggle("hc", next);
      localStorage.setItem("a11y.highContrast", String(next));
      return next;
    });
  }, []);

  return (
    <A11yContext.Provider value={{ highContrast, toggleHighContrast }}>
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y() {
  return useContext(A11yContext);
}
