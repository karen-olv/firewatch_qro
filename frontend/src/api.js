const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status} llamando a ${path}`);
  }
  return res.json();
}

export const api = {
  resumen: () => request("/api/estadisticas/resumen"),
  topMunicipios: () => request("/api/estadisticas/top-municipios"),
  tendencia: (meses) => request(`/api/estadisticas/tendencia?meses=${meses}`),
  incendiosActivos: () => request("/api/incendios?estado=activo"),
  alertas: () => request("/api/alertas"),
  reportes: () => request("/api/reportes"),
  validarReporte: (id) => request(`/api/reportes/${id}/validar`, { method: "PATCH" }),
};
