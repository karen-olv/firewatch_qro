from flask import Blueprint, jsonify
from app.models import Zona

bp = Blueprint("zonas", __name__, url_prefix="/api/zonas")


@bp.get("")
def listar_zonas():
    """
    Listar todas las zonas registradas (usado por el selector de la app móvil
    al crear un reporte).
    ---
    tags:
      - Zonas
    responses:
      200:
        description: Lista de zonas
    """
    zonas = Zona.query.order_by(Zona.nombre).all()
    return jsonify([z.to_dict() for z in zonas])
