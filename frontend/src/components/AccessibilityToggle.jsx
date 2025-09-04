import { useA11y } from "../context/AccessibilityContext";

export default function AccessibilityToggle() {
  const { highContrast, toggleHighContrast } = useA11y();

  return (
    <button
      type="button"
      onClick={toggleHighContrast}
      aria-pressed={highContrast}
      aria-label="Przełącz tryb wysokiego kontrastu"
      className="focus-outline px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:opacity-90 transition"
    >
      {highContrast ? "Wysoki kontrast: ON" : "Wysoki kontrast: OFF"}
    </button>
  );
}
