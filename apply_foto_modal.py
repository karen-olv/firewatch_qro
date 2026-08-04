#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1. Agregar estado para la foto ampliada (despues de esVisible)
old1 = '  const esVisible = (key) => active === "dashboard" || active === key;'
new1 = old1 + '\n\n  const [fotoAmpliada, setFotoAmpliada] = useState(null);'
replacements.append(("estado foto", old1, new1))

# 2. Cambiar el onClick de la miniatura para abrir el modal en vez de window.open
old2 = '                          onClick={() => window.open(`data:image/jpeg;base64,${r.foto}`, "_blank")}'
new2 = '                          onClick={() => setFotoAmpliada(r.foto)}'
replacements.append(("onClick miniatura", old2, new2))

# 3. Agregar el modal justo antes del cierre del componente (antes del ultimo </div> del fw-root)
old3 = '''      </main>
    </div>
  );
}'''
new3 = '''      </main>

      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, cursor: "zoom-out", padding: 20,
          }}
        >
          <img
            src={`data:image/jpeg;base64,${fotoAmpliada}`}
            alt="Foto del reporte ampliada"
            style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 10, boxShadow: "0 0 40px rgba(0,0,0,0.6)" }}
          />
        </div>
      )}
    </div>
  );
}'''
replacements.append(("modal foto", old3, new3))

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

print("OK: visor de fotos con modal aplicado correctamente.")
