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
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://192.168.100.99:5173",
                    "http://192.168.100.99:5000",
                ]
            }
        },
        supports_credentials=True,
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
    # Página principal y docs: listan todos los endpoints de la API
    # ---------------------------------------------------------------
    def _pagina_endpoints():
        reglas = sorted(
            (r for r in app.url_map.iter_rules() if r.endpoint != "static"),
            key=lambda r: (r.rule, sorted(r.methods or [])),
        )

        filas = []
        for regla in reglas:
            metodos = sorted(
                m for m in (regla.methods or [])
                if m not in ("HEAD", "OPTIONS")
            )
            filas.append(
                f"<tr>"
                f"<td><span class='badge {metodos[0].lower() if metodos else 'get'}'>{' '.join(metodos) or 'GET'}</span></td>"
                f"<td><code>{regla.rule}</code></td>"
                f"<td>{regla.endpoint}</td>"
                f"</tr>"
            )

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FireWatch QRO API - Endpoints</title>
<style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, #0b1d33 0%, #122a47 100%);
        color: #e6edf3;
        min-height: 100vh;
        padding: 2rem 1rem;
    }}
    .container {{ max-width: 900px; margin: 0 auto; }}
    header {{ text-align: center; margin-bottom: 2rem; }}
    header h1 {{
        font-size: 1.9rem;
        background: linear-gradient(90deg, #f97316, #ef4444);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }}
    header p {{ color: #9db1c7; margin-top: .4rem; }}
    .card {{
        background: rgba(255, 255, 255, .06);
        border: 1px solid rgba(255, 255, 255, .1);
        border-radius: 14px;
        overflow: hidden;
        backdrop-filter: blur(6px);
    }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ padding: .85rem 1rem; text-align: left; }}
    th {{
        background: rgba(255, 255, 255, .08);
        font-size: .8rem;
        text-transform: uppercase;
        letter-spacing: .05em;
        color: #9db1c7;
    }}
    tr:not(:last-child) td {{ border-bottom: 1px solid rgba(255, 255, 255, .07); }}
    td code {{
        background: rgba(255, 255, 255, .08);
        padding: .2rem .5rem;
        border-radius: 6px;
        font-size: .85rem;
        color: #7dd3fc;
        word-break: break-all;
    }}
    .badge {{
        display: inline-block;
        padding: .22rem .6rem;
        border-radius: 999px;
        font-size: .72rem;
        font-weight: 700;
        letter-spacing: .03em;
    }}
    .badge.get {{ background: #164e63; color: #67e8f9; }}
    .badge.post {{ background: #14532d; color: #86efac; }}
    .badge.patch {{ background: #713f12; color: #fde047; }}
    .badge.put {{ background: #78350f; color: #fdba74; }}
    .badge.delete {{ background: #7f1d1d; color: #fca5a5; }}
    footer {{ text-align: center; margin-top: 2rem; color: #64748b; font-size: .85rem; }}
</style>
</head>
<body>
<div class="container">
    <header>
        <h1>🔥 FireWatch QRO API</h1>
        <p>Listado de endpoints disponibles</p>
    </header>
    <div class="card">
        <table>
            <thead>
                <tr><th>Método</th><th>Ruta</th><th>Función</th></tr>
            </thead>
            <tbody>
                {''.join(filas)}
            </tbody>
        </table>
    </div>
    <footer>FireWatch QRO &middot; API v1.0.0 &middot; Generado automáticamente</footer>
</div>
</body>
</html>"""

    @app.get("/")
    def inicio():
        return _pagina_endpoints()

    # Health Check
    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "servicio": "FireWatch QRO API"
        }), 200

    return app
