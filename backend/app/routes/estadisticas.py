from flask import Blueprint, request, jsonify
from sqlalchemy import func
from datetime import datetime, timedelta
from app.extensions import db
from app.models import Municipio, Zona, Incendio

bp = Blueprint("estadisticas", __name__, url_prefix="/api")


@bp.get("/municipios")
def listar_municipios():
    """
    Listar municipios de Querétaro.
    ---
    tags:
- Estadísticas
    responses:
200:
        description: Lista de municipios
    """
    municipios = Municipio.query.order_by(Municipio.nombre).all()
    return jsonify([m.to_dict() for m in municipios])


@bp.get("/estadisticas/top-municipios")
def top_municipios():
    """
    Municipios con más incendios registrados (histórico).
    ---
    tags:
Estadísticas
    parameters:
- name: limit
        in: query
        type: integer
        required: false
        default: 6
        description: Número máximo de municipios a devolver
    responses:
200:
        description: Ranking de municipios por incendios
    """
    resultados = (
        db.session.query(Municipio.nombre, func.count(
            Incendio.id).label("incendios"))
        .join(Zona, Zona.municipio_id == Municipio.id)
        .join(Incendio, Incendio.zona_id == Zona.id)
        .group_by(Municipio.nombre)
        .order_by(func.count(Incendio.id).desc())
        .limit(int(request.args.get("limit", 6)))
        .all()
    )
    return jsonify([{"municipio": r[0], "incendios": r[1]} for r in resultados])


@bp.get("/estadisticas/tendencia")
def tendencia_incendios():
    """
    Serie de incendios agrupados por mes para graficar tendencia.
    ---
    tags:
- Estadísticas
    parameters:
- name: meses
        in: query
        type: integer
        required: false
        default: 12
        description: Cuántos meses hacia atrás se consultan
    responses:
200:
        description: Serie de incendios por periodo (YYYY-MM)
    """
    meses = int(request.args.get("meses", 12))
    desde = datetime.utcnow() - timedelta(days=meses * 30)

    resultados = (
        db.session.query(
            func.date_format(Incendio.fecha_deteccion,
                             "%Y-%m").label("periodo"),
            func.count(Incendio.id).label("incendios"),
        )
        .filter(Incendio.fecha_deteccion >= desde)
        .group_by("periodo")
        .order_by("periodo")
        .all()
    )
    return jsonify([{"periodo": r[0], "incendios": r[1]} for r in resultados])


@bp.get("/estadisticas/resumen")
def resumen_kpis():
    """
    KPIs principales del dashboard.
    ---
    tags:
- Estadísticas
    responses:
200:
        description: Resumen con incendios activos, riesgo alto, zonas y municipios
    """
    incendios_activos = Incendio.query.filter_by(estado="activo").count()
    incendios_alto_riesgo = Incendio.query.filter_by(
        estado="activo", nivel_riesgo="alto").count()
    zonas_monitoreadas = Zona.query.count()
    municipios_con_zonas = db.session.query(
        Zona.municipio_id).distinct().count()

    return jsonify({
        "incendios_activos": incendios_activos,
        "incendios_alto_riesgo": incendios_alto_riesgo,
        "zonas_monitoreadas": zonas_monitoreadas,
        "municipios_activos": municipios_con_zonas,
    })
