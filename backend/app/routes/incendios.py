from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Incendio, Zona  # <-- Importamos Zona
from datetime import datetime         # <-- Importamos datetime

bp = Blueprint("incendios", __name__, url_prefix="/api/incendios")


@bp.get("")
def obtener_incendios():
    estado = request.args.get('estado')
    query = Incendio.query

    if estado:
        query = query.filter_by(estado=estado)

    incendios = query.order_by(Incendio.fecha_deteccion.desc()).all()
    return jsonify([inc.to_dict() for inc in incendios])


@bp.post("")
def crear_incendio():
    """Endpoint para que la app móvil registre nuevos incendios validados"""
    data = request.get_json(force=True)

    # 1. Validaciones de que la zona exista
    if not data or not data.get('zona_id'):
        return jsonify({"error": "Falta el zona_id"}), 400

    zona_existe = Zona.query.get(data.get('zona_id'))
    if not zona_existe:
        return jsonify({"error": "La zona indicada no existe."}), 404

    # 2. Validar que solo acepten valores permitidos
    niveles_permitidos = ["bajo", "medio", "alto"]
    estados_permitidos = ["activo", "contenido", "controlado"]

    nivel = data.get('nivel_riesgo', 'bajo').lower()
    estado = data.get('estado', 'activo').lower()

    if nivel not in niveles_permitidos:
        return jsonify({"error": f"Nivel inválido. Usa: {niveles_permitidos}"}), 400

    if estado not in estados_permitidos:
        return jsonify({"error": f"Estado inválido. Usa: {estados_permitidos}"}), 400

    # 3. Crear el registro
    nuevo_incendio = Incendio(
        zona_id=data.get('zona_id'),
        nivel_riesgo=nivel,
        estado=estado,
        descripcion=data.get('descripcion', ''),
        fuente=data.get('fuente', 'app_movil'),
        fecha_deteccion=datetime.utcnow()
    )

    db.session.add(nuevo_incendio)
    db.session.commit()

    return jsonify(nuevo_incendio.to_dict()), 201
