from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Usuario

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/registro")
def registro():
    data = request.get_json(force=True)

    if Usuario.query.filter_by(email=data.get("email")).first():
        return jsonify({"error": "Ese correo ya está registrado"}), 400

    usuario = Usuario(
        nombre=data.get("nombre"),
        email=data.get("email"),
        rol=data.get("rol", "ciudadano"),
    )
    usuario.set_password(data.get("password"))
    db.session.add(usuario)
    db.session.commit()
    return jsonify(usuario.to_dict()), 201


@bp.post("/login")
def login():
    data = request.get_json(force=True)
    usuario = Usuario.query.filter_by(email=data.get("email")).first()

    if not usuario or not usuario.check_password(data.get("password", "")):
        return jsonify({"error": "Correo o contraseña incorrectos"}), 401

    token = create_access_token(identity=str(usuario.id), additional_claims={"rol": usuario.rol})
    return jsonify({"access_token": token, "usuario": usuario.to_dict()})


@bp.get("/perfil")
@jwt_required()
def perfil():
    usuario_id = get_jwt_identity()
    usuario = Usuario.query.get_or_404(usuario_id)
    return jsonify(usuario.to_dict())
