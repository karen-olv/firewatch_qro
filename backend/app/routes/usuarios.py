from flask import Blueprint, jsonify
from app.models import Usuario

bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


@bp.get("")
def listar_usuarios():
    """
    Listar todos los usuarios registrados.
    ---
    tags:
      - Usuarios
    responses:
      200:
        description: Lista de usuarios
    """
    usuarios = Usuario.query.order_by(Usuario.fecha_registro.desc()).all()
    return jsonify([u.to_dict() for u in usuarios])
