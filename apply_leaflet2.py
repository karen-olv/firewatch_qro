#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1. Agregar import de Leaflet
old1 = 'import { api } from "./api";\nimport "./App.css";'
new1 = (
    'import { api } from "./api";\n'
    'import "./App.css";\n'
    'import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";\n'
    'import "leaflet/dist/leaflet.css";'
)
replacements.append(("import leaflet", old1, new1))

# 2. Reemplazar el bloque del mapa esquematico por el mapa real
old2_start = '            <div className="fw-map">'
old2_end = '</div>\n            </div>\n          </div>\n\n          <div className="fw-card" id="card-alertas"'

start_idx = content.find(old2_start)
end_idx = content.find(old2_end)

new_map_block = '''            <div className="fw-map fw-map-real">
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

          <div className="fw-card" id="card-alertas"'''

if start_idx == -1 or end_idx == -1:
    print("ERROR: no se encontro el bloque del mapa esperado. No se modifico nada.")
    sys.exit(1)

content_new = content[:start_idx] + new_map_block + content[end_idx + len(old2_end):]

# Verificar import tambien
if old1 not in content_new if False else old1 not in content:
    print("ERROR: no se encontro el bloque de imports. No se modifico nada.")
    sys.exit(1)

content_new = content_new.replace(old1, new1, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content_new)

print("OK: Leaflet insertado correctamente con mapa real de Queretaro.")
