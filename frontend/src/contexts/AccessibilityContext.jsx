import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [focusOutline, setFocusOutline] = useState(true);

  // restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem('a11y');
      if (raw) {
        const s = JSON.parse(raw);
        setEnabled(!!s.enabled);
        setHighContrast(!!s.highContrast);
        setFontScale(Number(s.fontScale) || 1);
        setReduceMotion(!!s.reduceMotion);
        setFocusOutline(s.focusOutline ?? true);
      }
    } catch {}
  }, []);

  // persist + apply
  useEffect(() => {
    const s = { enabled, highContrast, fontScale, reduceMotion, focusOutline };
    localStorage.setItem('a11y', JSON.stringify(s));

    document.body.dataset.highContrast = highContrast ? 'on' : 'off';
    document.documentElement.style.setProperty('--font-scale', String(fontScale));

    if (reduceMotion) {
      document.documentElement.style.setProperty('--motion-scale', '0');
    } else {
      document.documentElement.style.removeProperty('--motion-scale');
    }
  }, [enabled, highContrast, fontScale, reduceMotion, focusOutline]);

  // actions
  const toggleEnabled = () => setEnabled(v => !v);
  const increaseFont = () => setFontScale(v => Math.min(1.6, +(v + 0.1).toFixed(2)));
  const decreaseFont = () => setFontScale(v => Math.max(0.8, +(v - 0.1).toFixed(2)));
  const reset = () => {
    setEnabled(true);
    setHighContrast(false);
    setFontScale(1);
    setReduceMotion(false);
    setFocusOutline(true);
    stopReading();
  };

  // TTS
  function read(text) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pl-PL';
      window.speechSynthesis.speak(u);
    } catch {}
  }
  function readSelection() {
    try {
      const sel = window.getSelection?.().toString().trim();
      if (sel) read(sel); else readPage();
    } catch { readPage(); }
  }
  function readPage() {
    const main = document.querySelector('main') || document.getElementById('root') || document.body;
    read(main?.innerText || document.title);
  }
  function stopReading() {
    try { window.speechSynthesis.cancel(); } catch {}
  }

  const value = useMemo(() => ({
    enabled, highContrast, fontScale, reduceMotion, focusOutline,
    setHighContrast, setFontScale, setReduceMotion, setFocusOutline,
    toggleHighContrast: () => setHighContrast(v => !v),
    toggleReduceMotion: () => setReduceMotion(v => !v),
    toggleEnabled,
    increaseFont, decreaseFont, reset,
    readPage, readSelection, stopReading,
  }), [enabled, highContrast, fontScale, reduceMotion, focusOutline]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility musi być użyty wewnątrz <AccessibilityProvider>');
  return ctx;
}
