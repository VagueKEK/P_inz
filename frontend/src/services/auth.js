const API = import.meta.env.VITE_API_URL || "";

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export async function ensureCsrf() {
  // ustawia csrftoken cookie przez /api/csrf/ w backend/urls.py
  await fetch(`${API}/api/csrf/`, { credentials: "include" });
}

export async function login(username, password) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken");

  const res = await fetch(`${API}/api/auth/login/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken || "",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Login failed");
  return data; // { ok, user }
}

export async function logout() {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken");

  const res = await fetch(`${API}/api/auth/logout/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRFToken": csrftoken || "",
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Logout failed");
  return data;
}

export async function me() {
  const res = await fetch(`${API}/api/auth/me/`, {
    credentials: "include",
  });
  return res.json();
}

export async function register(username, password, email) {
  await ensureCsrf();
  const csrftoken = getCookie("csrftoken");

  const res = await fetch(`${API}/api/auth/register/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken || "",
    },
    body: JSON.stringify({ username, password, email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Register failed");
  return data;
}
