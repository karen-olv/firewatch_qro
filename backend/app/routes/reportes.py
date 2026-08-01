from flask import Blueprint, request, jsonify
from app.extensions import db
# <-- Aquí ya importamos Zona para que no marque rojo
from app.models import Reporte, Zona
from datetime import datetime         # <-- Aquí ya importamos datetime

bp = Blueprint("reportes", __name__, url_prefix="/api/reportes")


@bp.get("")
def listar_reportes():
    """
    Listar reportes ciudadanos (máximo 50, más recientes primero).
    ---
    tags:
      - Reportes
    parameters:
      - name: validado
        in: query
        type: boolean
        required: false
        description: Filtrar por validado (true/false)
    responses:
      200:
        description: Lista de reportes
    """
    validado = request.args.get("validado")  # "true" | "false"
    query = Reporte.query
    if validado is not None:
        query = query.filter_by(validado=(validado.lower() == "true"))
    reportes = query.order_by(Reporte.fecha.desc()).limit(50).all()
    return jsonify([r.to_dict() for r in reportes])


@bp.post("")
def crear_reporte():
    """
    Crear un reporte ciudadano.
    ---
    tags:
      - Reportes
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - zona_id
            - descripcion
          properties:
            nombre_reportante:
              type: string
              default: Anónimo
            zona_id:
              type: integer
              example: 1
            descripcion:
              type: string
            es_critico:
              type: boolean
              default: false
    responses:
      201:
        description: Reporte creado
      400:
        description: Faltan datos obligatorios
      404:
        description: Zona no encontrada
    """
    data = request.get_json(force=True)

    # 1. Validar que mandaron los datos mínimos obligatorios
    if not data or not data.get('zona_id') or not data.get('descripcion'):
        return jsonify(
            {"error": "Faltan datos obligatorios (zona_id, descripcion)"}
        ), 400

    # 2. Validar que la zona_id realmente exista en tu BD
    zona_existe = Zona.query.get(data.get('zona_id'))
    if not zona_existe:
        return jsonify({"error": f"La zona con ID {data.get('zona_id')} no exist."}), 404

    # 3. Crear el registro
    reporte = Reporte(
        nombre_reportante=data.get(
            "nombre_reportante", data.get("nombre", "Anónimo")),
        zona_id=data.get("zona_id"),
        descripcion=data.get("descripcion"),
        es_critico=data.get("es_critico", False),
        validado=False,
        fecha=datetime.utcnow()
    )

    db.session.add(reporte)
    db.session.commit()

    # Usamos tu to_dict() que está mucho más limpio
    return jsonify(reporte.to_dict()), 201


@bp.patch("/<int:reporte_id>/validar")
def validar_reporte(reporte_id):
    """
    Marcar un reporte como validado (Protección Civil).
    ---
    tags:
      - Reportes
    parameters:
      - name: reporte_id
        in: path
        type: integer
        required: true
        description: ID del reporte a validar
    responses:
      200:
        description: Reporte validado
      404:
        description: Reporte no encontrado
    """
    reporte = Reporte.query.get_or_404(reporte_id)
    reporte.validado = True
    db.session.commit()
    return jsonify(reporte.to_dict())
