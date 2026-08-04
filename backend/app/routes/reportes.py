import json
import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
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

    # 2. Validar formato/longitud de los campos
    zona_id = data.get('zona_id')
    if not isinstance(zona_id, int) or isinstance(zona_id, bool):
        return jsonify({"error": "zona_id debe ser un entero"}), 400

    descripcion = data.get('descripcion')
    if not isinstance(descripcion, str) or not (10 <= len(descripcion.strip()) <= 500):
        return jsonify(
            {"error": "descripcion debe tener entre 10 y 500 caracteres"}
        ), 400

    nombre_reportante = data.get("nombre_reportante", data.get("nombre"))
    if nombre_reportante and len(str(nombre_reportante).strip()) < 3:
        return jsonify(
            {"error": "nombre_reportante debe tener al menos 3 caracteres"}
        ), 400

    # 3. Validar que la zona_id realmente exista en tu BD
    zona_existe = Zona.query.get(zona_id)
    if not zona_existe:
        return jsonify({"error": f"La zona con ID {zona_id} no exist."}), 404

    # 3. Crear el registro
    reporte = Reporte(
        nombre_reportante=(
            data.get("nombre_reportante", data.get("nombre")) or "Anónimo"
        ),
        zona_id=data.get("zona_id"),
        descripcion=data.get("descripcion"),
        es_critico=data.get("es_critico", False),
        validado=False,
        fecha=datetime.utcnow(),
        foto=data.get("foto"),
    )

    db.session.add(reporte)
    db.session.commit()

    # Si el reporte es crítico, se publica en Redis para que los workers
    # (flask1/flask2) lo procesen y generen Incendio + Alerta automáticamente.
    if reporte.es_critico:
        try:
            import redis as redis_lib
            redis_url = current_app.config.get(
                "REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
            r = redis_lib.Redis.from_url(redis_url, decode_responses=True)
            r.rpush("reportes_criticos", json.dumps({
                "reporte_id": reporte.id,
                "zona_id": reporte.zona_id,
                "descripcion": reporte.descripcion,
            }))
            current_app.logger.info(
                "Reporte crítico %s publicado en Redis", reporte.id)
        except Exception as exc:  # noqa: BLE001
            # Si Redis no está disponible, no rompemos el reporte;
            # simplemente queda pendiente para que un admin lo valide.
            current_app.logger.warning(
                "No se pudo publicar en Redis: %s", exc)

    # Usamos tu to_dict() que está mucho más limpio
    return jsonify(reporte.to_dict()), 201


@bp.patch("/<int:reporte_id>/validar")
@jwt_required()
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
