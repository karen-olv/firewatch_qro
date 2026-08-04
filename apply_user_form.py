#!/usr/bin/env python3
import sys

app_path = "frontend/src/App.jsx"
api_path = "frontend/src/api.js"

# ---------- 1. api.js: agregar función registrarUsuario ----------
with open(api_path, "r", encoding="utf-8") as f:
    api_content = f.read()

old_api_end = 'validarReporte: (id) => request(`/api/reportes/${id}/validar`, { method: "PATCH" }),'
new_api_end = old_api_end + '\n  registrarUsuario: (data) => request("/api/auth/registro", { method: "POST", body: JSON.stringify(data) }),'

if old_api_end not in api_content:
    print("ERROR api.js: no se encontro el punto de insercion.")
    sys.exit(1)

api_content = api_content.replace(old_api_end, new_api_end, 1)
with open(api_path, "w", encoding="utf-8") as f:
    f.write(api_content)

# ---------- 2. App.jsx: agregar estado + formulario ----------
with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 2a. Agregar estados nuevos (justo despues de "const [cargando, setCargando] = useState(true);")
old_state = "  const [cargando, setCargando] = useState(true);"
new_state = old_state + '''
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
  };'''

if old_state not in content:
    print("ERROR App.jsx: no se encontro el punto de insercion de estado.")
    sys.exit(1)
content = content.replace(old_state, new_state, 1)

# 2b. Insertar la tarjeta de formulario justo antes de la barra de admin
old_admin_bar_start = '        {/* ADMIN BAR */}'
new_block = '''        {/* CREAR USUARIO */}
        <div className="fw-card" style={{ marginBottom: 16 }}>
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

        {/* ADMIN BAR */}'''

if old_admin_bar_start not in content:
    print("ERROR App.jsx: no se encontro el punto de insercion del formulario.")
    sys.exit(1)
content = content.replace(old_admin_bar_start, new_block, 1)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: formulario de crear usuario insertado correctamente.")
