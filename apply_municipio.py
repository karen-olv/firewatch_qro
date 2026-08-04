#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1. Agregar estado del municipio seleccionado
old1 = '  const [fotoAmpliada, setFotoAmpliada] = useState(null);'
new1 = old1 + '\n  const [municipioSeleccionado, setMunicipioSeleccionado] = useState("");'
replacements.append(("estado municipio", old1, new1))

# 2. Insertar el selector justo antes de la grafica de barras de municipios
old2 = '''            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={topMunicipios} layout="vertical" margin={{ left: 10 }}>'''
new2 = '''            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 4 }}>
              <select
                value={municipioSeleccionado}
                onChange={(e) => setMunicipioSeleccionado(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 12 }}
              >
                <option value="">Todos los municipios</option>
                {topMunicipios.map((m) => (
                  <option key={m.municipio} value={m.municipio}>{m.municipio}</option>
                ))}
              </select>
              {municipioSeleccionado && (
                <span className="fw-mono" style={{ fontSize: 12, color: "var(--ember)" }}>
                  {topMunicipios.find((m) => m.municipio === municipioSeleccionado)?.incendios ?? 0} incendios registrados en {municipioSeleccionado}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart
                data={municipioSeleccionado ? topMunicipios.filter((m) => m.municipio === municipioSeleccionado) : topMunicipios}
                layout="vertical"
                margin={{ left: 10 }}
              >'''
replacements.append(("selector municipio", old2, new2))

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

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: selector de municipio aplicado correctamente.")
