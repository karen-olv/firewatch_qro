const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("fw_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status} llamando a ${path}`);
  }
  return res.json();
}

export const api = {
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  resumen: () => request("/api/estadisticas/resumen"),
  topMunicipios: () => request("/api/estadisticas/top-municipios"),
  tendencia: (meses) => request(`/api/estadisticas/tendencia?meses=${meses}`),
  incendiosActivos: () => request("/api/incendios?estado=activo"),
  alertas: () => request("/api/alertas"),
  reportes: () => request("/api/reportes"),
  validarReporte: (id) => request(`/api/reportes/${id}/validar`, { method: "PATCH" }),
};
