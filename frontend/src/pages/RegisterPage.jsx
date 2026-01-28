import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import logo from "../assets/SubSenseIco.png";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const u = username.trim();
    if (!u) return setErr("Podaj login");
    if (password1.length < 8) return setErr("Hasło min. 8 znaków");
    if (password1 !== password2) return setErr("Hasła nie są takie same");

    setBusy(true);
    try {
      await register(u, password1, email.trim());
      nav("/", { replace: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.error ||
        e2?.message ||
        "Rejestracja nie wyszła";
      setErr(String(msg));
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
            <div className="auth-sub">Załóż konto</div>
          </div>
        </div>

        <h1 className="auth-title">Rejestracja</h1>
        <div className="auth-desc muted">
          Zarejestruj się, aby mieć dostęp do zarządzania swoimi subskrypcjami.
        </div>

        {err ? <div className="auth-error">{err}</div> : null}

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">
            <span className="auth-label-text">Login</span>
            <input
              className="input auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder=""
              required
            />
          </label>

          <label className="auth-label">
            <span className="auth-label-text">Email (opcjonalnie)</span>
            <input
              className="input auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder=""
            />
          </label>

          <label className="auth-label">
            <span className="auth-label-text">Hasło</span>
            <div className="auth-pw-wrap">
              <input
                className="input auth-input"
                type={showPw1 ? "text" : "password"}
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                autoComplete="new-password"
                placeholder=""
                required
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw1((v) => !v)}
                aria-label={showPw1 ? "Ukryj hasło" : "Pokaż hasło"}
                title={showPw1 ? "Ukryj hasło" : "Pokaż hasło"}
              >
                {showPw1 ? "👁️" : "👁"}
              </button>
            </div>
          </label>

          <label className="auth-label">
            <span className="auth-label-text">Powtórz hasło</span>
            <div className="auth-pw-wrap">
              <input
                className="input auth-input"
                type={showPw2 ? "text" : "password"}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                placeholder=""
                required
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw2((v) => !v)}
                aria-label={showPw2 ? "Ukryj hasło" : "Pokaż hasło"}
                title={showPw2 ? "Ukryj hasło" : "Pokaż hasło"}
              >
                {showPw2 ? "👁️" : "👁"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="btn btn-green auth-submit"
            disabled={busy || !username.trim() || !password1 || !password2}
          >
            {busy ? "Tworzenie konta..." : "Załóż konto"}
          </button>

          <div className="auth-bottom">
            <span className="muted">Masz już konto?</span>
            <NavLink className="auth-link" to="/login">
              Logowanie
            </NavLink>
          </div>
        </form>
      </div>
    </div>
  );
}
