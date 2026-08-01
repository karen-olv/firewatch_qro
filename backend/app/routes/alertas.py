from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Alerta, Incendio

bp = Blueprint("alertas", __name__, url_prefix="/api/alertas")


@bp.get("")
def listar_alertas():
    """
    Listar alertas activas (máximo 20).
    ---
    tags:
      - Alertas
    responses:
      200:
        description: Lista de alertas
    """
    alertas = Alerta.query.order_by(Alerta.fecha.desc()).limit(20).all()
    return jsonify([a.to_dict() for a in alertas])


@bp.post("")
def crear_alerta():
    """
    Crear una alerta vinculada a un incendio.
    ---
    tags:
      - Alertas
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - incendio_id
          properties:
            incendio_id:
              type: integer
              example: 1
            nivel:
              type: string
              enum: [bajo, medio, alto]
              default: bajo
            descripcion:
              type: string
            enviada_a:
              type: string
              default: Protección Civil Querétaro
    responses:
      201:
        description: Alerta creada
      400:
        description: incendio_id inválido o no existe
    """
    data = request.get_json(force=True)

    incendio_id = data.get("incendio_id")
    if not incendio_id or not Incendio.query.get(incendio_id):
        return jsonify({"error": "incendio_id inválido o no existe"}), 400

    alerta = Alerta(
        incendio_id=incendio_id,
        nivel=data.get("nivel", "bajo"),
        descripcion=data.get("descripcion"),
        enviada_a=data.get("enviada_a", "Protección Civil Querétaro"),
    )
    db.session.add(alerta)
    db.session.commit()
    return jsonify(alerta.to_dict()), 201
