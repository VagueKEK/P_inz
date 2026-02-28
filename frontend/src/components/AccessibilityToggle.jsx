import React, { useState, useEffect } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext.jsx';

export default function AccessibilityToggle() {
  const {
    enabled, toggleEnabled,
    highContrast, toggleHighContrast,
    increaseFont, decreaseFont, reset,
    readPage, readSelection, stopReading, fontScale
  } = useAccessibility();

  const [open, setOpen] = useState(false);

  const onMainClick = () => {
    if (highContrast) {
      toggleHighContrast();
      setOpen(false);
      return;
    }
    if (!enabled) toggleEnabled();
    toggleHighContrast();
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        setOpen(v => !v);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        aria-label="Tryb dostępności"
        className="a11y-fab"
        onClick={onMainClick}
      >
        {highContrast ? 'TRYB: ON' : 'TRYB DOSTĘPNOŚCI'}
      </button>

      {open && (
        <div className="a11y-panel" role="group" aria-label="Ustawienia dostępności">
          <div className="a11y-row">
            <button onClick={increaseFont} aria-label="Powiększ czcionkę">A+</button>
            <button onClick={decreaseFont} aria-label="Pomniejsz czcionkę">A-</button>
            <button onClick={reset} aria-label="Resetuj ustawienia">Reset</button>
          </div>

          <div className="a11y-row">
            <button onClick={toggleHighContrast} aria-pressed={highContrast}>
              {highContrast ? 'Kontrast: ON' : 'Kontrast: OFF'}
            </button>
          </div>

          <div className="a11y-row">
            <button onClick={readSelection} aria-label="Czytaj zaznaczenie">Czytaj zaznaczenie</button>
            <button onClick={readPage} aria-label="Czytaj stronę">Czytaj stronę</button>
            <button onClick={stopReading} aria-label="Zatrzymaj czytanie">Stop</button>
          </div>

          <small style={{opacity:.75}}>Skala: {(fontScale*100).toFixed(0)}%</small>
        </div>
      )}
    </>
  );
}
