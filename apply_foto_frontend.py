#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''            <table className="fw-table">
              <thead>
                <tr><th>Reportante</th><th>Municipio</th><th>Hora</th><th>Crítico</th><th>Validado</th></tr>
              </thead>
              <tbody>
                {reportes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nombre_reportante}</td>'''

new = '''            <table className="fw-table">
              <thead>
                <tr><th>Foto</th><th>Reportante</th><th>Municipio</th><th>Hora</th><th>Crítico</th><th>Validado</th></tr>
              </thead>
              <tbody>
                {reportes.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.foto ? (
                        <img
                          src={`data:image/jpeg;base64,${r.foto}`}
                          alt="Foto del reporte"
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", cursor: "pointer", border: "1px solid var(--line)" }}
                          onClick={() => window.open(`data:image/jpeg;base64,${r.foto}`, "_blank")}
                        />
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td>{r.nombre_reportante}</td>'''

if old not in content:
    print("ERROR: no se encontro el punto de insercion (tabla de reportes).")
    sys.exit(1)

content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: columna de foto agregada a la tabla de reportes.")
