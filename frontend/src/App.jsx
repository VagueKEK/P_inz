import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import SubscriptionPanel from "./components/SubscriptionPanel";

import { AccessibilityProvider } from "./contexts/AccessibilityContext.jsx";
import AccessibilityToggle from "./components/AccessibilityToggle.jsx";

function TopNav() {
  return (
    <header className="appbar">
      <nav className="container nav-inner">
        <div className="brand">Centrum Subskrypcji</div>
        <div className="nav-links">
          <NavLink to="/" end className="nav-link">Subskrypcje</NavLink>
          <NavLink to="/vod" className="nav-link" onClick={(e)=>e.preventDefault()}>VoD</NavLink>
          <NavLink to="/summary" className="nav-link" onClick={(e)=>e.preventDefault()}>Podsumowanie</NavLink>
        </div>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <Router>
        {/* BEZ transform/zoom – normalny layout, sticky działa */}
        <TopNav />
        <main className="container">
          <Routes>
            <Route path="/" element={<SubscriptionPanel />} />
            <Route path="*" element={<SubscriptionPanel />} />
          </Routes>
        </main>

        {/* Pływający przełącznik dostępności */}
        <AccessibilityToggle />
      </Router>
    </AccessibilityProvider>
  );
}
