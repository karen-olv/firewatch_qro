from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Reporte

bp = Blueprint("reportes", __name__, url_prefix="/api/reportes")


@bp.get("")
def listar_reportes():
    validado = request.args.get("validado")  # "true" | "false"
    query = Reporte.query
    if validado is not None:
        query = query.filter_by(validado=(validado.lower() == "true"))
    reportes = query.order_by(Reporte.fecha.desc()).limit(50).all()
    return jsonify([r.to_dict() for r in reportes])


@bp.post("")
def crear_reporte():
    """Este endpoint lo usa la app móvil cuando un ciudadano manda un reporte."""
    data = request.get_json(force=True)

    reporte = Reporte(
        nombre_reportante=data.get("nombre_reportante", "Anónimo"),
        zona_id=data.get("zona_id"),
        descripcion=data.get("descripcion"),
        es_critico=data.get("es_critico", False),
        validado=False,
    )
    db.session.add(reporte)
    db.session.commit()
    return jsonify(reporte.to_dict()), 201


@bp.patch("/<int:reporte_id>/validar")
def validar_reporte(reporte_id):
    """Protección Civil marca un reporte como validado desde el dashboard."""
    reporte = Reporte.query.get_or_404(reporte_id)
    reporte.validado = True
    db.session.commit()
    return jsonify(reporte.to_dict())
