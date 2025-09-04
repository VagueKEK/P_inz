import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import { useAccessibility } from "./contexts/AccessibilityContext";
import SubscriptionPanel from "./components/SubscriptionPanel";

function TopNav() {
  const a11y = useAccessibility();

  return (
    <header className="appbar">
      <nav className="container nav-inner">
        <div className="brand">Centrum Subskrypcji</div>

        <div className="nav-links">
          <NavLink to="/" end className="nav-link">Subskrypcje</NavLink>
          <NavLink to="/vod" className="nav-link" onClick={(e)=>e.preventDefault()}>VoD</NavLink>
          <NavLink to="/summary" className="nav-link" onClick={(e)=>e.preventDefault()}>Podsumowanie</NavLink>
        </div>

        <button
          className="btn btn-sky a11y-toggle"
          onClick={a11y.toggleContrast}
          aria-pressed={a11y.highContrast}
        >
          Tryb dostępności: {a11y.highContrast ? "ON" : "OFF"}
        </button>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <TopNav />
      <main className="container">
        <Routes>
          <Route path="/" element={<SubscriptionPanel />} />
          <Route path="*" element={<SubscriptionPanel />} />
        </Routes>
      </main>
    </Router>
  );
}
