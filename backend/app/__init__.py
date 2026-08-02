from flask import Flask, jsonify
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics

from flasgger import Swagger

from app.config import Config
from app.extensions import db, jwt

from app.routes import (
    incendios,
    reportes,
    alertas,
    estadisticas,
    auth,
    usuarios,
)


def create_app():
    app = Flask(__name__)

    # Cargar configuración
    app.config.from_object(Config)

    # Permitir peticiones desde React (PC y teléfono)
    # CORS abierto para desarrollo y para la app móvil/Expo.
    # En producción se sirve todo por HAProxy (mismo origen), por lo que
    # el navegador no necesita CORS. Lo dejamos permisivo para no romper
    # el desarrollo local ni el teléfono.
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*",
                "methods": ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
        supports_credentials=False,
    )

    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)

    # Prometheus
    metrics = PrometheusMetrics(app, group_by="endpoint")
    metrics.info(
        "firewatch_api_info",
        "Información de la API FireWatch QRO",
        version="1.0.0",
    )

    # Registrar Blueprints
    app.register_blueprint(incendios.bp)
    app.register_blueprint(reportes.bp)
    app.register_blueprint(alertas.bp)
    app.register_blueprint(estadisticas.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuarios.bp)

    # ---------------------------------------------------------------
    # Swagger UI en /docs (especificación OpenAPI en /apispec.json)
    # ---------------------------------------------------------------
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec",
                "route": "/apispec.json",
                "rule_filter": lambda rule: rule.endpoint != "static",
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs",
    }
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "FireWatch QRO API",
            "description": (
                "API de monitoreo de incendios de Querétaro. "
                "Usa el botón **Try it out** para probar los endpoints en vivo."
            ),
            "version": "1.0.0",
        },
        "basePath": "/",
        "schemes": ["http"],
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "Token JWT. Ejemplo: `Bearer <token>`",
            }
        },
        "security": [],
    }
    Swagger(app, config=swagger_config, template=swagger_template)

    # ---------------------------------------------------------------
    # Página principal: mensaje simple de estado
    # ---------------------------------------------------------------
    @app.get("/")
    def inicio():
        return """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FireWatch QRO API</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, #0b1d33 0%, #122a47 100%);
        color: #e6edf3;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .card {
        background: rgba(255, 255, 255, .06);
        border: 1px solid rgba(255, 255, 255, .1);
        border-radius: 16px;
        padding: 2.5rem 3rem;
        text-align: center;
        backdrop-filter: blur(6px);
        max-width: 90%;
    }
    .status {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 0 4px rgba(34, 197, 94, .2);
        margin-bottom: 1rem;
    }
    h1 {
        font-size: 1.6rem;
        background: linear-gradient(90deg, #f97316, #ef4444);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: .5rem;
    }
    p { color: #9db1c7; font-size: 1.05rem; }
    .sub { color: #64748b; font-size: .85rem; margin-top: 1rem; }
</style>
</head>
<body>
<div class="card">
    <div class="status"></div>
    <h1>🔥 FireWatch QRO API</h1>
    <p>API conectada correctamente</p>
    <div class="sub">Documentación interactiva en <a href="/docs" style="color:#7dd3fc">/docs</a></div>
</div>
</body>
</html>"""

    # Health Check
    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "servicio": "FireWatch QRO API"
        }), 200

    return app
