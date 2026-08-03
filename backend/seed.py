"""
Llena la base de datos con datos de ejemplo
(municipios, zonas, incendios, reportes y alertas).

Uso standalone:
    python seed.py

Uso desde otro módulo (p. ej. init_db.py): llamar a run() dentro de un
app_context ya activo — run() no crea ni empuja su propio Flask app,
para evitar registrar las métricas de Prometheus dos veces en el mismo
proceso (ver backend/app/__init__.py -> PrometheusMetrics).
"""
from datetime import datetime, timedelta
import random

from app.extensions import db
from app.models import Municipio, Zona, Incendio, Reporte, Alerta, Usuario

MUNICIPIOS_ZONAS = {
    "Jalpan de Serra": [("Sierra Gorda - Núcleo", 21.2167, -99.4833)],
    "Landa de Matamoros": [("Landa Norte", 21.1667, -99.3333)],
    "Cadereyta de Montes": [("Cadereyta Centro", 20.6975, -99.8214)],
    "Pinal de Amoles": [("Pinal Alto", 21.1333, -99.6167)],
    "San Joaquín": [("San Joaquín Rural", 20.9333, -99.6167)],
    "Colón": [("Colón Oriente", 20.7867, -100.0611)],
    "Amealco de Bonfil": [("Amealco Sur", 20.1833, -100.1500)],
    "Ezequiel Montes": [("Peña de Bernal", 20.7500, -99.9500)],
    "Querétaro": [("Querétaro Capital", 20.5888, -100.3899)],
}


def run():
    """Siembra datos de ejemplo. Requiere un app_context ya activo."""
    db.drop_all()
    db.create_all()

    # --- municipios y zonas ---
    zonas_por_nombre = {}
    for municipio_nombre, zonas in MUNICIPIOS_ZONAS.items():
        municipio = Municipio(nombre=municipio_nombre)
        db.session.add(municipio)
        db.session.flush()  # para obtener el id sin hacer commit todavía

        for zona_nombre, lat, lng in zonas:
            zona = Zona(nombre=zona_nombre, municipio_id=municipio.id, lat=lat, lng=lng)
            db.session.add(zona)
            db.session.flush()
            zonas_por_nombre[zona_nombre] = zona

    # --- incendios de ejemplo (histórico de los últimos 24 meses) ---
    niveles = ["bajo", "medio", "alto"]
    zonas = list(zonas_por_nombre.values())
    incendios_creados = []
    for _ in range(60):
        zona = random.choice(zonas)
        dias_atras = random.randint(0, 720)
        incendio = Incendio(
            zona_id=zona.id,
            nivel_riesgo=random.choice(niveles),
            estado=random.choice(["activo", "contenido", "controlado"]),
            descripcion="Registro generado para pruebas y estadísticas.",
            fuente=random.choice(["sensor", "ciudadano"]),
            fecha_deteccion=datetime.utcnow() - timedelta(days=dias_atras),
        )
        db.session.add(incendio)
        db.session.flush()
        incendios_creados.append(incendio)

    # --- fuerza 3 incendios activos "de hoy" para que el dashboard se vea vivo ---
    for zona_nombre, nivel in [
        ("Sierra Gorda - Núcleo", "alto"),
        ("Peña de Bernal", "medio"),
        ("Amealco Sur", "bajo"),
    ]:
        zona = zonas_por_nombre[zona_nombre]
        incendio = Incendio(
            zona_id=zona.id,
            nivel_riesgo=nivel,
            estado="activo",
            descripcion="Incendio activo bajo monitoreo.",
            fuente="sensor",
            fecha_deteccion=datetime.utcnow() - timedelta(minutes=random.randint(10, 120)),
        )
        db.session.add(incendio)
        db.session.flush()
        incendios_creados.append(incendio)

        alerta = Alerta(
            incendio_id=incendio.id,
            nivel=nivel,
            descripcion="Alerta generada automáticamente por el sistema.",
            enviada_a="Protección Civil Querétaro",
        )
        db.session.add(alerta)

    # --- reportes ciudadanos de ejemplo ---
    nombres = ["María Elena Ruiz", "José Antonio Vega", "Guardia forestal #12", "Sensor térmico Z-06"]
    for nombre in nombres:
        zona = random.choice(zonas)
        reporte = Reporte(
            nombre_reportante=nombre,
            zona_id=zona.id,
            descripcion="Reporte de ejemplo para pruebas del dashboard.",
            es_critico=random.choice([True, False]),
            validado=random.choice([True, False]),
            fecha=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
        )
        db.session.add(reporte)

    # --- usuario admin de ejemplo ---
    admin = Usuario(nombre="Admin Protección Civil", email="admin@firewatchqro.mx", rol="admin")
    admin.set_password("admin123")
    db.session.add(admin)

    db.session.commit()
    print("Base de datos creada y sembrada con datos de ejemplo ✅")
    print("Usuario admin de prueba -> email: admin@firewatchqro.mx | password: admin123")


if __name__ == "__main__":
    from app import create_app

    app = create_app()
    with app.app_context():
        run()
