from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.extensions import db, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    CORS(app)  # permite que el dashboard (React, otro puerto) llame a esta API

    from app.routes import incendios, reportes, alertas, estadisticas, auth, usuarios

    app.register_blueprint(incendios.bp)
    app.register_blueprint(reportes.bp)
    app.register_blueprint(alertas.bp)
    app.register_blueprint(estadisticas.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuarios.bp)

    @app.get("/api/salud")
    def salud():
        return jsonify({"status": "ok", "servicio": "FireWatch QRO API"})

    return app
