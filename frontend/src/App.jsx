import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import {
  Flame, MapPinned, ClipboardList, BarChart3, Users, Settings,
  ShieldAlert, CircleDot, Clock, Radio, ChevronRight, Loader2,
  LogOut, Mail, Lock,
} from "lucide-react";
import { api } from "./api";
import "./App.css";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

  // Auth
  const [token, setToken] = useState(() => localStorage.getItem("fw_token"));
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fw_usuario") || "null");
    } catch {
      return null;
    }
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [loginCargando, setLoginCargando] = useState(false);

  const [resumen, setResumen] = useState(null);
  const [topMunicipios, setTopMunicipios] = useState([]);
  const [tendencia, setTendencia] = useState([]);
  const [incendios, setIncendios] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", email: "", password: "", rol: "ciudadano" });
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [mensajeUsuario, setMensajeUsuario] = useState(null);

  const crearUsuario = async (e) => {
    e.preventDefault();
    setCreandoUsuario(true);
    setMensajeUsuario(null);
    try {
      await api.registrarUsuario(nuevoUsuario);
      setMensajeUsuario({ tipo: "ok", texto: "Usuario creado correctamente." });
      setNuevoUsuario({ nombre: "", email: "", password: "", rol: "ciudadano" });
    } catch (err) {
      setMensajeUsuario({ tipo: "error", texto: err.message || "No se pudo crear el usuario." });
    } finally {
      setCreandoUsuario(false);
    }
  };

  const scrollToId = (id) => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navTargets = { dashboard: null, mapa: "card-mapa", reportes: "card-reportes", estadisticas: "card-estadisticas", usuarios: "card-usuarios", config: null };

  const irASeccion = (key) => {
    setActive(key);
    scrollToId(navTargets[key]);
  };

  const esVisible = (key) => active === "dashboard" || active === key;

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
    if (!token) return;
    cargarTodo();
    const intervalo = setInterval(cargarTodo, 30000); // refresca cada 30s
    return () => clearInterval(intervalo);
  }, [cargarTodo, token]);

  useEffect(() => {
    if (!token) return;
    api.tendencia(RANGES[range]).then(setTendencia).catch((e) => setError(e.message));
  }, [range, token]);

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginCargando(true);
    try {
      const data = await api.login(loginEmail, loginPass);
      localStorage.setItem("fw_token", data.access_token);
      localStorage.setItem("fw_usuario", JSON.stringify(data.usuario));
      setToken(data.access_token);
      setUsuario(data.usuario);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginCargando(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("fw_token");
    localStorage.removeItem("fw_usuario");
    setToken(null);
    setUsuario(null);
  };

  if (!token) {
    return (
      <div className="fw-root fw-login-root">
        <form className="fw-login-card" onSubmit={iniciarSesion}>
          <div className="fw-login-logo">
            <div className="fw-brand-mark"><Flame size={20} color="#14160F" /></div>
          </div>
          <div className="fw-login-title">FireWatch QRO</div>
          <div className="fw-login-sub">Panel de Protección Civil · Inicia sesión</div>

          <label className="fw-login-label">Correo electrónico</label>
          <div className="fw-login-field">
            <Mail size={15} />
            <input
              type="email"
              placeholder="admin@example.mx"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
          </div>

          <label className="fw-login-label">Contraseña</label>
          <div className="fw-login-field">
            <Lock size={15} />
            <input
              type="password"
              placeholder="••••••••"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
            />
          </div>

          {loginError && <div className="fw-login-error">{loginError}</div>}

          <button type="submit" className="fw-login-btn" disabled={loginCargando}>
            {loginCargando ? <Loader2 size={16} className="fw-spin" /> : <LogOut size={16} />}
            {loginCargando ? "Ingresando…" : "Entrar al panel"}
          </button>

          <div className="fw-login-hint fw-mono">
            Demo: admin@firewatchqro.mx / admin123
          </div>
        </form>
      </div>
    );
  }

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
          <div key={n.key} className={`fw-nav-item ${active === n.key ? "active" : ""}`} onClick={() => irASeccion(n.key)}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="fw-admin-chip">
              <div className="fw-avatar">{usuario?.nombre?.slice(0, 2).toUpperCase() || "PC"}</div>
              {usuario?.nombre || "Protección Civil Querétaro"}
              <ChevronRight size={13} />
            </div>
            <button className="fw-admin-btn" onClick={cerrarSesion} title="Cerrar sesión">
              <LogOut size={13} /> Salir
            </button>
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
          <div className="fw-card" id="card-mapa" style={{ display: esVisible("mapa") ? undefined : "none" }}>
            <div className="fw-card-head">
              <div className="fw-card-title"><MapPinned size={16} /> Mapa en vivo — incendios activos</div>
              <div className="fw-mono fw-live-tag"><Radio size={12} /> actualiza cada 30s</div>
            </div>
            <div className="fw-map fw-map-real">
              <MapContainer
                center={[20.75, -99.9]}
                zoom={8}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", borderRadius: "10px" }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {incendios.map((inc) => {
                  if (inc.lat == null || inc.lng == null) return null;
                  return (
                    <CircleMarker
                      key={inc.id}
                      center={[inc.lat, inc.lng]}
                      radius={12}
                      pathOptions={{
                        color: levelColor[inc.nivel_riesgo],
                        fillColor: levelColor[inc.nivel_riesgo],
                        fillOpacity: 0.85,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <b>{inc.zona}</b><br />
                        Municipio: {inc.municipio}<br />
                        Nivel de riesgo: {inc.nivel_riesgo}<br />
                        Coordenadas: {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          <div className="fw-card" id="card-alertas" style={{ display: esVisible("mapa") ? undefined : "none" }}>
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
          <div className="fw-card" id="card-estadisticas" style={{ display: esVisible("estadisticas") ? undefined : "none" }}>
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

          <div className="fw-card" id="card-reportes" style={{ display: esVisible("reportes") ? undefined : "none" }}>
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

        {/* CREAR USUARIO */}
        <div className="fw-card" id="card-usuarios" style={{ marginBottom: 16, display: esVisible("usuarios") ? undefined : "none" }}>
          <div className="fw-card-head">
            <div className="fw-card-title"><Users size={16} /> Crear usuario</div>
          </div>
          <form onSubmit={crearUsuario} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 160px" }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Nombre</label>
              <input required value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)" }} />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Correo</label>
              <input required type="email" value={nuevoUsuario.email} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)" }} />
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Contraseña</label>
              <input required type="password" value={nuevoUsuario.password} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)" }} />
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Rol</label>
              <select value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)" }}>
                <option value="ciudadano">Ciudadano</option>
                <option value="proteccion_civil">Protección Civil</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={creandoUsuario} className="fw-admin-btn" style={{ height: 38 }}>
              {creandoUsuario ? "Creando..." : "Crear usuario"}
            </button>
          </form>
          {mensajeUsuario && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: mensajeUsuario.tipo === "ok" ? "var(--green)" : "var(--red)" }}>
              {mensajeUsuario.texto}
            </div>
          )}
        </div>

        {active === "config" && (
          <div className="fw-card" style={{ marginBottom: 16 }}>
            <div className="fw-card-head">
              <div className="fw-card-title"><Settings size={16} /> Configuración</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Esta sección está en desarrollo. Próximamente: gestión de roles, notificaciones y parámetros del sistema.
            </div>
          </div>
        )}

        {/* ADMIN BAR */}
        <div className="fw-admin-bar">
          <div className="fw-card-title"><Users size={16} /> Administración · Protección Civil</div>
          <div className="fw-admin-actions">
            <div className="fw-admin-btn" onClick={() => irASeccion("mapa")}><ShieldAlert size={13} /> Ver alertas</div>
            <div className="fw-admin-btn" onClick={() => irASeccion("mapa")}><MapPinned size={13} /> Mapa completo</div>
            <div className="fw-admin-btn" onClick={() => irASeccion("usuarios")}><Users size={13} /> Usuarios</div>
            <div className="fw-admin-btn" onClick={() => scrollToId(null)}><Settings size={13} /> Configuración</div>
          </div>
        </div>
      </main>
    </div>
  );
}
