from flask import Flask, jsonify
from flask_cors import CORS

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

    # 3. Importación y registro de Blueprints
    from app.routes import (
        incendios,
        reportes,
        alertas,
        estadisticas,
        auth,
        usuarios
    )

    app.register_blueprint(incendios.bp)
    app.register_blueprint(reportes.bp)
    app.register_blueprint(alertas.bp)
    app.register_blueprint(estadisticas.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuarios.bp)

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

    return app
