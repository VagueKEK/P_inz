import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import SubscriptionPanel from "./components/SubscriptionPanel";
import Calendar from "./components/Calendar";
import { AccessibilityProvider } from "./contexts/AccessibilityContext.jsx";
import AccessibilityToggle from "./components/AccessibilityToggle.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import SummaryPanel from "./components/SummaryPanel.jsx";

function TopNav() {
  return (
    <header className="appbar">
      <nav className="container nav-inner">
        <div className="brand">SubSense</div>
        <div className="nav-links">
          <NavLink to="/" end className="nav-link">Subskrypcje</NavLink>
          <NavLink to="/calendar" className="nav-link">Kalendarz</NavLink>
          <NavLink to="/summary" className="nav-link">Podsumowanie</NavLink>
          <NavLink to="/settings" className="nav-link">Ustawienia</NavLink>
        </div>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <Router>
        <TopNav />
        {/* Globalny panel dostępności na każdej stronie */}
        <AccessibilityToggle />
        <main className="container">
          <Routes>
            <Route path="/" element={<SubscriptionPanel />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="*" element={<SubscriptionPanel />} />
            <Route path="/settings" element={<SettingsPanel />} />
            <Route path="/summary" element={<SummaryPanel />} />
          </Routes>
        </main>
      </Router>
    </AccessibilityProvider>
  );
}
