from flask import Blueprint, jsonify
from app.auth_utils import roles_required
from app.models import Usuario

bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


@bp.get("")
@roles_required("admin")
def listar_usuarios():
    """
    Listar todos los usuarios registrados.
    ---
    tags:
      - Usuarios
    security:
      - Bearer: []
    responses:
      200:
        description: Lista de usuarios
      401:
        description: Token no proporcionado o inválido
    """
    usuarios = Usuario.query.order_by(Usuario.fecha_registro.desc()).all()
    return jsonify([u.to_dict() for u in usuarios])
