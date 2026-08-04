#!/usr/bin/env python3
import sys

path = "backend/app/routes/reportes.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''    reporte = Reporte(
        nombre_reportante=(
            data.get("nombre_reportante", data.get("nombre")) or "Anónimo"
        ),
        zona_id=data.get("zona_id"),
        descripcion=data.get("descripcion"),
        es_critico=data.get("es_critico", False),
        validado=False,
        fecha=datetime.utcnow()
    )'''

new = '''    reporte = Reporte(
        nombre_reportante=(
            data.get("nombre_reportante", data.get("nombre")) or "Anónimo"
        ),
        zona_id=data.get("zona_id"),
        descripcion=data.get("descripcion"),
        es_critico=data.get("es_critico", False),
        validado=False,
        fecha=datetime.utcnow(),
        foto=data.get("foto"),
    )'''

if old not in content:
    print("ERROR: no se encontro el punto de insercion.")
    sys.exit(1)

content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: campo foto agregado a la creacion de reportes.")
