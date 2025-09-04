import { useEffect, useState } from "react";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function AccessibilityBar() {
  const [scale, setScale] = useState(() => {
    const s = localStorage.getItem("fsScale");
    return s ? parseFloat(s) : 1;
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--fs-scale", String(scale));
    localStorage.setItem("fsScale", String(scale));
  }, [scale]);

  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-info h-9 px-3" onClick={() => setScale((s) => clamp(Number((s - 0.1).toFixed(2)), 0.8, 1.8))}>A−</button>
      <button className="btn btn-info h-9 px-3" onClick={() => setScale((s) => clamp(Number((s + 0.1).toFixed(2)), 0.8, 1.8))}>A+</button>
      <button className="btn h-9 px-3" onClick={() => setScale(1)}>Reset</button>
    </div>
  );
}
