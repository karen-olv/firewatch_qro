"""
Inicializa la base de datos antes de arrancar el servidor.

- Espera a que MySQL esté listo (con reintentos).
- Crea todas las tablas (no destructivo, usa create_all).
- Si no hay municipios (BD vacía), ejecuta el seed con datos demo.

Uso (normalmente dentro del contenedor Docker):
    python init_db.py
"""
import os
import sys
import time

from sqlalchemy import text

from app import create_app
from app.extensions import db
from app.models import Municipio

app = create_app()

RETRY_ATTEMPTS = int(os.getenv("DB_RETRY_ATTEMPTS", 30))
RETRY_DELAY_SECONDS = int(os.getenv("DB_RETRY_DELAY_SECONDS", 2))


def wait_for_database():
    """Reintenta conectar a la BD hasta que esté disponible."""
    with app.app_context():
        for intento in range(1, RETRY_ATTEMPTS + 1):
            try:
                db.session.execute(text("SELECT 1"))
                print(
                    f"[init_db] Conexión a MySQL establecida (intento {intento}).")
                return
            except Exception as exc:  # noqa: BLE001
                print(
                    f"[init_db] MySQL no está listo (intento {intento}/{RETRY_ATTEMPTS}): {exc}"
                )
                time.sleep(RETRY_DELAY_SECONDS)
        print("[init_db] No se pudo conectar a MySQL. Abortando.")
        sys.exit(1)


def init_db():
    with app.app_context():
        print("[init_db] Creando tablas...")
        db.create_all()

        # Si la BD está vacía (sin municipios), sembrar datos demo
        if Municipio.query.first() is None:
            print("[init_db] BD vacía -> sembrando datos de ejemplo (seed)...")
            from seed import run as seed_run

            seed_run()
        else:
            print("[init_db] La BD ya tiene datos, no se vuelve a sembrar.")


if __name__ == "__main__":
    wait_for_database()
    init_db()
    print("[init_db] Inicialización completada ✅")
