import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import SubscriptionPanel from "./components/SubscriptionPanel";
import Calendar from "./components/Calendar";
import { AccessibilityProvider } from "./contexts/AccessibilityContext.jsx";
import AccessibilityToggle from "./components/AccessibilityToggle.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import SummaryPanel from "./components/SummaryPanel.jsx";

import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";

function TopNav() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();

  async function onLogout() {
    try {
      await logout();
    } finally {
      nav("/login", { replace: true });
    }
  }

  return (
    <header className="appbar">
      <nav className="container nav-inner">
        <div className="brand">SubSense</div>

        <div className="nav-links">
          {loading ? null : user ? (
            <>
              <NavLink to="/" end className="nav-link">Subskrypcje</NavLink>
              <NavLink to="/calendar" className="nav-link">Kalendarz</NavLink>
              <NavLink to="/summary" className="nav-link">Podsumowanie</NavLink>
              <NavLink to="/settings" className="nav-link">Ustawienia</NavLink>

              {user.isAdmin && (
                <NavLink to="/admin/users" className="nav-link">Użytkownicy</NavLink>
              )}

              <span className="nav-link" style={{ opacity: 0.8 }}>
                {user.username}{user.isAdmin ? " (admin)" : ""}
              </span>

              <button
                onClick={onLogout}
                className="nav-link"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">Zaloguj</NavLink>
              <NavLink to="/register" className="nav-link">Rejestracja</NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <Router>
        <AuthProvider>
          <TopNav />
          <AccessibilityToggle />

          <main className="container">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/"
                element={
                  <RequireAuth>
                    <SubscriptionPanel />
                  </RequireAuth>
                }
              />

              <Route
                path="/calendar"
                element={
                  <RequireAuth>
                    <Calendar />
                  </RequireAuth>
                }
              />

              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <SettingsPanel />
                  </RequireAuth>
                }
              />

              <Route
                path="/summary"
                element={
                  <RequireAuth>
                    <SummaryPanel />
                  </RequireAuth>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <RequireAuth>
                    <AdminUsersPage />
                  </RequireAuth>
                }
              />

              <Route
                path="*"
                element={
                  <RequireAuth>
                    <SubscriptionPanel />
                  </RequireAuth>
                }
              />
            </Routes>
          </main>
        </AuthProvider>
      </Router>
    </AccessibilityProvider>
  );
}
