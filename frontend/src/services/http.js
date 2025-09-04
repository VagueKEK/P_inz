// frontend/src/services/http.js
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

// proste pobieranie cookie
function getCookie(name) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

const http = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

// dla POST/PATCH/DELETE dodaj X-CSRFToken z cookie
http.interceptors.request.use((config) => {
  const unsafe = !/^(GET|HEAD|OPTIONS|TRACE)$/i.test(config.method || "GET");
  if (unsafe) {
    const token = getCookie("csrftoken");
    if (token) config.headers["X-CSRFToken"] = token;
  }
  return config;
});

export default http;

// helper – zawsze dawaj trailing slash dla DRF
export const url = (p) => (p.endsWith("/") ? p : p + "/");
