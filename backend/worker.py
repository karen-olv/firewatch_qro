"""
FireWatch QRO - Worker de procesamiento asíncrono.

Los workers `flask1` y `flask2` corren este script.
Consumen la cola de Redis `reportes_criticos` (donde la API publica los
reportes ciudadanos con `es_critico=True`) y automáticamente:

1. Crean un Incendio (estado=activo, nivel_riesgo=alto).
2. Crean una Alerta vinculada a ese incendio.
3. Marcan el reporte como validado.

Así, la información enviada desde la App Móvil se ve reflejada
en la contraparte Web (dashboard) en tiempo real.
"""
import os
import json
import threading
import time

import redis

from flask import Flask

from app import create_app
from app.extensions import db
from app.models import Reporte, Incendio, Alerta

app = create_app()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
QUEUE = "reportes_criticos"
FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))


def procesar_reporte(data: dict):
    """Crea Incendio + Alerta a partir de un reporte crítico."""
    reporte_id = data.get("reporte_id")
    zona_id = data.get("zona_id")
    descripcion = data.get("descripcion", "")

    with app.app_context():
        reporte = Reporte.query.get(reporte_id)
        if not reporte:
            print(f"[worker] Reporte {reporte_id} no existe. Omitido.")
            return

        if reporte.validado:
            print(f"[worker] Reporte {reporte_id} ya fue procesado. Omitido.")
            return

        # 1. Crear incendio activo de alto riesgo
        incendio = Incendio(
            zona_id=zona_id or reporte.zona_id,
            nivel_riesgo="alto",
            estado="activo",
            descripcion=f"Reporte ciudadano crítico: {descripcion[:200]}",
            fuente="app_movil",
        )
        db.session.add(incendio)
        db.session.flush()

        # 2. Crear alerta vinculada
        alerta = Alerta(
            incendio_id=incendio.id,
            nivel="alto",
            descripcion=(
                f"Alerta automática por reporte crítico de ciudadano. "
                f"{descripcion[:200]}"
            ),
            enviada_a="Protección Civil Querétaro",
        )
        db.session.add(alerta)

        # 3. Marcar reporte como validado/procesado
        reporte.validado = True
        reporte.incendio_id = incendio.id

        db.session.commit()
        print(
            f"[worker] Reporte {reporte_id} -> Incendio #{incendio.id} "
            f"+ Alerta #{alerta.id} ✅"
        )


def main():
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    print(f"[worker] Escuchando cola '{QUEUE}' en {REDIS_URL} ...")

    while True:
        try:
            # BLPOP bloquea 2s y vuelve a intentar (bucle infinito)
            resultado = r.blpop(QUEUE, timeout=2)
            if resultado is None:
                # Timeout sin mensajes: seguir esperando
                continue
            _, payload = resultado
            if payload is None:
                continue
            data = json.loads(payload)
            print(f"[worker] Recibido: {data}")
            procesar_reporte(data)
        except redis.ConnectionError as exc:
            print(f"[worker] Redis no disponible: {exc}")
            time.sleep(3)
        except Exception as exc:  # noqa: BLE001
            print(f"[worker] Error procesando mensaje: {exc}")
            time.sleep(1)


def run_metrics_server():
    """Expone /metrics en el puerto del worker para que Prometheus
    monitoree flask1 (5001) y flask2 (5002)."""
    from prometheus_flask_exporter import PrometheusMetrics

    metrics_app = Flask(f"worker_{FLASK_PORT}")
    PrometheusMetrics(metrics_app, group_by="endpoint")
    print(f"[worker] Métricas Prometheus en :{FLASK_PORT}/metrics")
    metrics_app.run(host="0.0.0.0", port=FLASK_PORT, threaded=True)


if __name__ == "__main__":
    # El worker consume la cola en un hilo mientras expone /metrics.
    threading.Thread(target=run_metrics_server, daemon=True).start()
    main()
