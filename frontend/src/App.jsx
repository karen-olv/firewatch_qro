import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import {
  Flame, MapPinned, ClipboardList, BarChart3, Users, Settings,
  ShieldAlert, CircleDot, Clock, Radio, ChevronRight, Loader2,
} from "lucide-react";
import { api } from "./api";
import "./App.css";

const NAV = [
  { key: "dashboard", label: "Panel general", icon: Flame },
  { key: "mapa", label: "Mapa en vivo", icon: MapPinned },
  { key: "reportes", label: "Reportes", icon: ClipboardList },
  { key: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  { key: "usuarios", label: "Usuarios", icon: Users },
  { key: "config", label: "Configuración", icon: Settings },
];

const RANGES = { "3M": 3, "1A": 12, "2A": 24 };
const levelColor = { alto: "var(--red)", medio: "var(--amber)", bajo: "var(--green)" };
const levelLabel = { alto: "var(--red)", medio: "var(--amber)", bajo: "var(--green)" };

// Coordenadas reales -> posición aproximada dentro del panel del mapa (proyección simple, no geográfica exacta)
function proyectar(lat, lng) {
  const x = ((lng + 100.4) / 0.9) * 100;
  const y = ((21.4 - lat) / 1.3) * 100;
  return { x: Math.min(Math.max(x, 6), 94), y: Math.min(Math.max(y, 10), 90) };
}

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [range, setRange] = useState("1A");

  const [resumen, setResumen] = useState(null);
  const [topMunicipios, setTopMunicipios] = useState([]);
  const [tendencia, setTendencia] = useState([]);
  const [incendios, setIncendios] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarTodo = useCallback(async () => {
    try {
      setError(null);
      const [r, tm, ac, al, rp] = await Promise.all([
        api.resumen(),
        api.topMunicipios(),
        api.incendiosActivos(),
        api.alertas(),
        api.reportes(),
      ]);
      setResumen(r);
      setTopMunicipios(tm);
      setIncendios(ac);
      setAlertas(al);
      setReportes(rp);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
    const intervalo = setInterval(cargarTodo, 30000); // refresca cada 30s
    return () => clearInterval(intervalo);
  }, [cargarTodo]);

  useEffect(() => {
    api.tendencia(RANGES[range]).then(setTendencia).catch((e) => setError(e.message));
  }, [range]);

  if (cargando) {
    return (
      <div className="fw-root fw-center">
        <Loader2 className="fw-spin" size={22} />
        <span style={{ marginLeft: 10 }}>Conectando con la API de FireWatch QRO…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fw-root fw-center fw-error">
        <ShieldAlert size={22} />
        <div style={{ marginLeft: 10 }}>
          <div>No se pudo conectar con el backend.</div>
          <div className="fw-mono" style={{ fontSize: 12, color: "var(--muted)" }}>{error}</div>
          <div className="fw-mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            Revisa que Flask esté corriendo en http://localhost:5000
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fw-root">
      {/* SIDEBAR */}
      <aside className="fw-sidebar">
        <div className="fw-brand">
          <div className="fw-brand-mark"><Flame size={18} color="#14160F" /></div>
          <div>
            <div className="fw-brand-name">FireWatch</div>
            <div className="fw-brand-sub">QRO · Sistema</div>
          </div>
        </div>
        {NAV.map((n) => (
          <div key={n.key} className={`fw-nav-item ${active === n.key ? "active" : ""}`} onClick={() => setActive(n.key)}>
            <n.icon size={16} />
            {n.label}
          </div>
        ))}
        <div className="fw-nav-footer">
          <span className="fw-pulse-dot" />
          Sistema en línea · datos reales de la API
        </div>
      </aside>

      {/* MAIN */}
      <main className="fw-main">
        <div className="fw-topbar">
          <div>
            <div className="fw-title">Panel de monitoreo</div>
            <div className="fw-title-sub fw-mono">Querétaro, MX · {new Date().toLocaleString("es-MX")}</div>
          </div>
          <div className="fw-admin-chip">
            <div className="fw-avatar">PC</div>
            Protección Civil Querétaro
            <ChevronRight size={13} />
          </div>
        </div>

        {/* KPIs */}
        <div className="fw-kpi-row">
          <div className="fw-kpi">
            <div className="fw-kpi-accent" style={{ background: "var(--red)" }} />
            <div className="fw-kpi-label">Incendios activos</div>
            <div className="fw-kpi-value">{resumen?.incendios_activos ?? "—"}</div>
            <div className="fw-kpi-delta">{resumen?.incendios_alto_riesgo ?? 0} en nivel de riesgo alto</div>
          </div>
          <div className="fw-kpi">
            <div className="fw-kpi-accent" style={{ background: "var(--amber)" }} />
            <div className="fw-kpi-label">Reportes recientes</div>
            <div className="fw-kpi-value">{reportes.length}</div>
            <div className="fw-kpi-delta">{reportes.filter((r) => r.validado).length} validados</div>
          </div>
          <div className="fw-kpi">
            <div className="fw-kpi-accent" style={{ background: "var(--ember)" }} />
            <div className="fw-kpi-label">Alertas activas</div>
            <div className="fw-kpi-value">{alertas.length}</div>
            <div className="fw-kpi-delta">Enviadas a autoridades locales</div>
          </div>
          <div className="fw-kpi">
            <div className="fw-kpi-accent" style={{ background: "var(--green)" }} />
            <div className="fw-kpi-label">Zonas monitoreadas</div>
            <div className="fw-kpi-value">{resumen?.zonas_monitoreadas ?? "—"}</div>
            <div className="fw-kpi-delta">En {resumen?.municipios_activos ?? "—"} municipios</div>
          </div>
        </div>

        {/* MAP + ALERTS */}
        <div className="fw-grid-2">
          <div className="fw-card">
            <div className="fw-card-head">
              <div className="fw-card-title"><MapPinned size={16} /> Mapa en vivo — incendios activos</div>
              <div className="fw-mono fw-live-tag"><Radio size={12} /> actualiza cada 30s</div>
            </div>
            <div className="fw-map">
              {incendios.map((inc) => {
                if (inc.lat == null || inc.lng == null) return null;
                const { x, y } = proyectar(inc.lat, inc.lng);
                return (
                  <React.Fragment key={inc.id}>
                    <div className="fw-map-zone" style={{ left: `${x}%`, top: `${y}%`, background: levelColor[inc.nivel_riesgo], color: levelColor[inc.nivel_riesgo] }}>
                      <CircleDot size={13} color="#14160F" />
                    </div>
                    <div className="fw-map-label" style={{ left: `${x + 2}%`, top: `${y - 4}%` }}>{inc.zona}</div>
                  </React.Fragment>
                );
              })}
              <div className="fw-map-footer">
                <span>Querétaro, México</span>
                <span>{incendios.length} incendios activos en el mapa</span>
              </div>
            </div>
          </div>

          <div className="fw-card">
            <div className="fw-card-head">
              <div className="fw-card-title"><ShieldAlert size={16} /> Alertas activas</div>
            </div>
            <div className="fw-alert-list">
              {alertas.length === 0 && <div className="fw-empty">No hay alertas activas por ahora.</div>}
              {alertas.map((a) => (
                <div className="fw-alert-item" key={a.id} style={{ borderLeftColor: levelLabel[a.nivel] }}>
                  <div className="fw-alert-top">
                    <span className="fw-alert-zona">{a.zona} — {a.municipio}</span>
                    <span className="fw-badge" style={{ background: levelLabel[a.nivel], color: "#14160F" }}>{a.nivel}</span>
                  </div>
                  <div className="fw-alert-desc">{a.descripcion}</div>
                  <div className="fw-alert-meta">
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> {new Date(a.fecha).toLocaleString("es-MX")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TOP MUNICIPIOS + REPORTES */}
        <div className="fw-grid-2">
          <div className="fw-card">
            <div className="fw-card-head">
              <div className="fw-card-title"><BarChart3 size={16} /> Tendencia y top municipios</div>
              <div className="fw-range-toggle">
                {Object.keys(RANGES).map((r) => (
                  <div key={r} className={`fw-range-btn ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>{r}</div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={tendencia}>
                <defs>
                  <linearGradient id="fwArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6A3D" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#FF6A3D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#333C29" vertical={false} />
                <XAxis dataKey="periodo" stroke="#8F9680" fontSize={10.5} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#1B2016", border: "1px solid #333C29", fontSize: 11 }} />
                <Area type="monotone" dataKey="incendios" stroke="#FF6A3D" fill="url(#fwArea)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={topMunicipios} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="#333C29" horizontal={false} />
                <XAxis type="number" stroke="#8F9680" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="municipio" type="category" stroke="#8F9680" fontSize={10.5} width={120} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1B2016", border: "1px solid #333C29", fontSize: 11 }} />
                <Bar dataKey="incendios" fill="#C7361B" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="fw-card">
            <div className="fw-card-head">
              <div className="fw-card-title"><ClipboardList size={16} /> Reportes recientes</div>
            </div>
            <table className="fw-table">
              <thead>
                <tr><th>Reportante</th><th>Municipio</th><th>Hora</th><th>Crítico</th><th>Validado</th></tr>
              </thead>
              <tbody>
                {reportes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nombre_reportante}</td>
                    <td style={{ color: "var(--muted)" }}>{r.municipio}</td>
                    <td className="fw-mono" style={{ color: "var(--muted)" }}>
                      {new Date(r.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <span className="fw-badge" style={{ background: r.es_critico ? "var(--red)" : "var(--panel-alt)", color: r.es_critico ? "#14160F" : "var(--muted)", border: r.es_critico ? "none" : "1px solid var(--line)" }}>
                        {r.es_critico ? "Sí" : "No"}
                      </span>
                    </td>
                    <td>
                      {r.validado ? (
                        <span className="fw-badge" style={{ background: "var(--green)", color: "#14160F" }}>Validado</span>
                      ) : (
                        <button className="fw-admin-btn" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => api.validarReporte(r.id).then(cargarTodo)}>
                          Validar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADMIN BAR */}
        <div className="fw-admin-bar">
          <div className="fw-card-title"><Users size={16} /> Administración · Protección Civil</div>
          <div className="fw-admin-actions">
            <div className="fw-admin-btn"><ShieldAlert size={13} /> Ver alertas</div>
            <div className="fw-admin-btn"><MapPinned size={13} /> Mapa completo</div>
            <div className="fw-admin-btn"><Users size={13} /> Usuarios</div>
            <div className="fw-admin-btn"><Settings size={13} /> Configuración</div>
          </div>
        </div>
      </main>
    </div>
  );
}
