#!/usr/bin/env python3
import sys

app_path = "frontend/src/App.jsx"
api_path = "frontend/src/api.js"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()
with open(api_path, "r", encoding="utf-8") as f:
    api_content = f.read()

replacements = []

# ---------- api.js: agregar crearAlerta ----------
old_api = 'registrarUsuario: (data) => request("/api/auth/registro", { method: "POST", body: JSON.stringify(data) }),'
new_api = old_api + '\n  crearAlerta: (data) => request("/api/alertas", { method: "POST", body: JSON.stringify(data) }),'
if old_api not in api_content:
    print("ERROR api.js: no se encontro el punto de insercion.")
    sys.exit(1)
api_content = api_content.replace(old_api, new_api, 1)
with open(api_path, "w", encoding="utf-8") as f:
    f.write(api_content)

# ---------- App.jsx: 1. Estados y handlers ----------
old1 = '  const esVisible = (key) => active === "dashboard" || active === key;'
new1 = old1 + '''

  const [filtroReportes, setFiltroReportes] = useState("todos");
  const reportesFiltrados = reportes.filter((r) => {
    if (filtroReportes === "validados") return r.validado;
    if (filtroReportes === "historico") return !r.validado;
    return true;
  });

  const [nuevaAlerta, setNuevaAlerta] = useState({ incendio_id: "", nivel: "medio", descripcion: "" });
  const [creandoAlerta, setCreandoAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState(null);

  const crearAlerta = async (e) => {
    e.preventDefault();
    setCreandoAlerta(true);
    setMensajeAlerta(null);
    try {
      await api.crearAlerta({ ...nuevaAlerta, incendio_id: parseInt(nuevaAlerta.incendio_id, 10) });
      setMensajeAlerta({ tipo: "ok", texto: "Alerta enviada correctamente." });
      setNuevaAlerta({ incendio_id: "", nivel: "medio", descripcion: "" });
      cargarTodo();
    } catch (err) {
      setMensajeAlerta({ tipo: "error", texto: err.message || "No se pudo enviar la alerta." });
    } finally {
      setCreandoAlerta(false);
    }
  };'''
replacements.append(("estados", old1, new1))

# ---------- 2. Botones de filtro en Reportes ----------
old2 = '''            <div className="fw-card-head">
              <div className="fw-card-title"><ClipboardList size={16} /> Reportes recientes</div>
            </div>'''
new2 = '''            <div className="fw-card-head">
              <div className="fw-card-title"><ClipboardList size={16} /> Reportes recientes</div>
              <div className="fw-range-toggle">
                <div className={`fw-range-btn ${filtroReportes === "todos" ? "active" : ""}`} onClick={() => setFiltroReportes("todos")}>Todos</div>
                <div className={`fw-range-btn ${filtroReportes === "validados" ? "active" : ""}`} onClick={() => setFiltroReportes("validados")}>Validados</div>
                <div className={`fw-range-btn ${filtroReportes === "historico" ? "active" : ""}`} onClick={() => setFiltroReportes("historico")}>Histórico</div>
              </div>
            </div>'''
replacements.append(("filtro reportes head", old2, new2))

# ---------- 3. Usar la lista filtrada en la tabla ----------
old3 = '{reportes.map((r) => ('
new3 = '{reportesFiltrados.map((r) => ('
replacements.append(("filtro reportes map", old3, new3))

# ---------- 4. Formulario de crear alerta, dentro de la tarjeta de alertas ----------
old4 = '''              ))}
            </div>
          </div>
        </div>

        {/* TOP MUNICIPIOS + REPORTES */}'''
new4 = '''              ))}
            </div>

            <form onSubmit={crearAlerta} style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 160px" }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>Incendio</label>
                <select required value={nuevaAlerta.incendio_id} onChange={(e) => setNuevaAlerta({ ...nuevaAlerta, incendio_id: e.target.value })}
                  style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 12 }}>
                  <option value="">Selecciona…</option>
                  {incendios.map((inc) => (
                    <option key={inc.id} value={inc.id}>{inc.zona} — {inc.municipio}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>Nivel</label>
                <select value={nuevaAlerta.nivel} onChange={(e) => setNuevaAlerta({ ...nuevaAlerta, nivel: e.target.value })}
                  style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 12 }}>
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <div style={{ flex: "2 1 220px" }}>
                <label style={{ fontSize: 11, color: "var(--muted)" }}>Descripción</label>
                <input required value={nuevaAlerta.descripcion} onChange={(e) => setNuevaAlerta({ ...nuevaAlerta, descripcion: e.target.value })}
                  style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 12 }} />
              </div>
              <button type="submit" disabled={creandoAlerta} className="fw-admin-btn" style={{ height: 34 }}>
                {creandoAlerta ? "Enviando..." : "Mandar alerta"}
              </button>
              {mensajeAlerta && (
                <div style={{ width: "100%", fontSize: 12, color: mensajeAlerta.tipo === "ok" ? "var(--green)" : "var(--red)" }}>
                  {mensajeAlerta.texto}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* TOP MUNICIPIOS + REPORTES */}'''
replacements.append(("form alerta", old4, new4))

errores = []
for nombre, old, new in replacements:
    if old not in content:
        errores.append(nombre)

if errores:
    print("ERROR: no se encontraron estos puntos de insercion:", ", ".join(errores))
    print("No se modifico App.jsx.")
    sys.exit(1)

for nombre, old, new in replacements:
    content = content.replace(old, new, 1)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: filtro de reportes y formulario de alertas aplicados correctamente.")
