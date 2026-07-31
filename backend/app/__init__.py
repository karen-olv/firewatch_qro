from flask import Flask, jsonify
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics

from app.config import Config
from app.extensions import db, jwt


def create_app():
    app = Flask(__name__)

    # 1. CARGAMOS LA CONFIGURACIÓN AQUÍ (Esto es lo que faltaba)
    app.config.from_object(Config)

    # Configuración CORS global para desarrollo
    CORS(app, resources={
        r"/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173"
            ]
        }
    })

    # 2. Inicializamos las extensiones (ahora sí leerán la config)
    db.init_app(app)
    jwt.init_app(app)

<<<<<<< HEAD
    # 3. Importación y registro de Blueprints
    from app.routes import (
        incendios,
        reportes,
        alertas,
        estadisticas,
        auth,
        usuarios
    )
=======
    # Expone métricas en /metrics: total de requests, duración, códigos de estado, etc.
    metrics = PrometheusMetrics(app, group_by="endpoint")
    metrics.info("firewatch_api_info", "Información de la API FireWatch QRO", version="1.0.0")

    from app.routes import incendios, reportes, alertas, estadisticas, auth, usuarios
>>>>>>> 5d95ac4 (Agrega monitoreo con Prometheus y Grafana)

    app.register_blueprint(incendios.bp)
    app.register_blueprint(reportes.bp)
    app.register_blueprint(alertas.bp)
    app.register_blueprint(estadisticas.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuarios.bp)

<<<<<<< HEAD
    # 4. Rutas base de prueba
    @app.get("/")
    def inicio():
        return jsonify({
            "mensaje": "FireWatch QRO API funcionando"
        })

    @app.get("/api/salud")
    def salud():
        return jsonify({
            "status": "ok",
            "servicio": "FireWatch QRO API"
        })
=======
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "servicio": "FireWatch QRO API"})
>>>>>>> 5d95ac4 (Agrega monitoreo con Prometheus y Grafana)

    return app