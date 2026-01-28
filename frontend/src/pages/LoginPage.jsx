import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import logo from "../assets/SubSenseIco.png";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(() => String(loc.state?.message || ""));

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username.trim(), password);
      const next = loc.state?.from?.pathname || "/";
      nav(next, { replace: true });
    } catch (e2) {
      const raw =
  e2?.response?.data?.error ||
  e2?.message ||
  "Nie udało się zalogować";

const low = String(raw).toLowerCase();

const msg =
  low.includes("bad credentials") ? "Nieprawidłowy login lub hasło." :
  low.includes("inactive") || low.includes("dezaktyw") ? "To konto zostało zdezaktywowane. Skontaktuj się z administratorem." :
  String(raw);

setErr(msg);

    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <img src={logo} alt="SubSense" className="auth-logo-img" />
          </div>
          <div className="auth-brand-text">
            <div className="auth-app">SubSense</div>
            <div className="auth-sub">Panel subskrypcji</div>
          </div>
        </div>

        <h1 className="auth-title">Zaloguj się</h1>
        <div className="auth-desc muted">Śledź subskrypcje bez chaosu.</div>

        {err ? <div className="auth-error">{err}</div> : null}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">
            <span className="auth-label-text">Login</span>
            <input
              className="input auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="np. kuba"
              required
            />
          </label>

          <label className="auth-label">
            <span className="auth-label-text">Hasło</span>
            <div className="auth-pw-wrap">
              <input
                className="input auth-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Ukryj hasło" : "Pokaż hasło"}
                title={showPw ? "Ukryj hasło" : "Pokaż hasło"}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="btn btn-green auth-submit"
            disabled={busy || !username.trim() || !password}
          >
            {busy ? "Logowanie..." : "Zaloguj"}
          </button>

          <div className="auth-bottom">
            <span className="muted">Nie masz konta?</span>
            <NavLink className="auth-link" to="/register">Rejestracja</NavLink>
          </div>
        </form>
      </div>
    </div>
  );
}
