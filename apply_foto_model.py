#!/usr/bin/env python3
import sys

path = "backend/app/models.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = '''    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    zona = db.relationship("Zona")'''
new1 = '''    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    foto = db.Column(db.Text, nullable=True)  # imagen en base64, enviada desde la app movil
    zona = db.relationship("Zona")'''

old2 = '''            "es_critico": self.es_critico,
            "validado": self.validado,
            "fecha": self.fecha.isoformat() if self.fecha else None,
        }'''
new2 = '''            "es_critico": self.es_critico,
            "validado": self.validado,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "foto": self.foto,
        }'''

if old1 not in content:
    print("ERROR: no se encontro el punto de insercion 1 (columna foto).")
    sys.exit(1)
if old2 not in content:
    print("ERROR: no se encontro el punto de insercion 2 (to_dict).")
    sys.exit(1)

content = content.replace(old1, new1, 1)
content = content.replace(old2, new2, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: campo foto agregado al modelo Reporte.")
