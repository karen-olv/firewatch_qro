from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Incendio, Zona

bp = Blueprint("incendios", __name__, url_prefix="/api/incendios")


@bp.get("")
def listar_incendios():
    estado = request.args.get("estado")  # activo | contenido | controlado
    query = Incendio.query
    if estado:
        query = query.filter_by(estado=estado)
    incendios = query.order_by(Incendio.fecha_deteccion.desc()).all()
    return jsonify([i.to_dict() for i in incendios])


@bp.get("/<int:incendio_id>")
def obtener_incendio(incendio_id):
    incendio = Incendio.query.get_or_404(incendio_id)
    return jsonify(incendio.to_dict())


@bp.post("")
def crear_incendio():
    data = request.get_json(force=True)

    zona_id = data.get("zona_id")
    if not zona_id or not Zona.query.get(zona_id):
        return jsonify({"error": "zona_id inválido o no existe"}), 400

    incendio = Incendio(
        zona_id=zona_id,
        nivel_riesgo=data.get("nivel_riesgo", "bajo"),
        estado=data.get("estado", "activo"),
        descripcion=data.get("descripcion"),
        fuente=data.get("fuente", "ciudadano"),
    )
    db.session.add(incendio)
    db.session.commit()
    return jsonify(incendio.to_dict()), 201


@bp.patch("/<int:incendio_id>")
def actualizar_incendio(incendio_id):
    incendio = Incendio.query.get_or_404(incendio_id)
    data = request.get_json(force=True)

    if "nivel_riesgo" in data:
        incendio.nivel_riesgo = data["nivel_riesgo"]
    if "estado" in data:
        incendio.estado = data["estado"]
    if "descripcion" in data:
        incendio.descripcion = data["descripcion"]

    db.session.commit()
    return jsonify(incendio.to_dict())
