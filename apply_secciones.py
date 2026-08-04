#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1. Agregar funcion esVisible despues de irASeccion
old1 = '''  const irASeccion = (key) => {
    setActive(key);
    scrollToId(navTargets[key]);
  };'''
new1 = old1 + '''

  const esVisible = (key) => active === "dashboard" || active === key;'''
replacements.append(("esVisible", old1, new1))

# 2. Ocultar/mostrar tarjeta de mapa
old2 = '<div className="fw-card" id="card-mapa">'
new2 = '<div className="fw-card" id="card-mapa" style={{ display: esVisible("mapa") ? undefined : "none" }}>'
replacements.append(("visibilidad mapa", old2, new2))

# 3. Ocultar/mostrar tarjeta de alertas (va junto con mapa)
old3 = '<div className="fw-card" id="card-alertas">'
new3 = '<div className="fw-card" id="card-alertas" style={{ display: esVisible("mapa") ? undefined : "none" }}>'
replacements.append(("visibilidad alertas", old3, new3))

# 4. Ocultar/mostrar tarjeta de estadisticas
old4 = '<div className="fw-card" id="card-estadisticas">'
new4 = '<div className="fw-card" id="card-estadisticas" style={{ display: esVisible("estadisticas") ? undefined : "none" }}>'
replacements.append(("visibilidad estadisticas", old4, new4))

# 5. Ocultar/mostrar tarjeta de reportes
old5 = '<div className="fw-card" id="card-reportes">'
new5 = '<div className="fw-card" id="card-reportes" style={{ display: esVisible("reportes") ? undefined : "none" }}>'
replacements.append(("visibilidad reportes", old5, new5))

# 6. Ocultar/mostrar tarjeta de crear usuario
old6 = '<div className="fw-card" id="card-usuarios" style={{ marginBottom: 16 }}>'
new6 = '<div className="fw-card" id="card-usuarios" style={{ marginBottom: 16, display: esVisible("usuarios") ? undefined : "none" }}>'
replacements.append(("visibilidad usuarios", old6, new6))

# 7. Placeholder para "Configuracion" (no tiene seccion propia)
old7 = '        {/* ADMIN BAR */}'
new7 = '''        {active === "config" && (
          <div className="fw-card" style={{ marginBottom: 16 }}>
            <div className="fw-card-head">
              <div className="fw-card-title"><Settings size={16} /> Configuración</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Esta sección está en desarrollo. Próximamente: gestión de roles, notificaciones y parámetros del sistema.
            </div>
          </div>
        )}

        {/* ADMIN BAR */}'''
replacements.append(("placeholder config", old7, new7))

errores = []
for nombre, old, new in replacements:
    if old not in content:
        errores.append(nombre)

if errores:
    print("ERROR: no se encontraron estos puntos de insercion:", ", ".join(errores))
    print("No se modifico ningun archivo.")
    sys.exit(1)

for nombre, old, new in replacements:
    content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: secciones independientes aplicadas correctamente (7/7 cambios).")
