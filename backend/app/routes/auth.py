import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Usuario

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@bp.post("/registro")
def registro():
    """
    Registrar un nuevo usuario.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - nombre
            - email
            - password
          properties:
            nombre:
              type: string
              example: Juan Pérez
            email:
              type: string
              example: juan@correo.com
            password:
              type: string
              example: secreto123
            rol:
              type: string
              enum: [admin, proteccion_civil, ciudadano]
              default: ciudadano
    responses:
      201:
        description: Usuario creado
      400:
        description: El correo ya está registrado
    """
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Cuerpo de la petición inválido"}), 400

    nombre = data.get("nombre")
    email = data.get("email")
    password = data.get("password")

    if not nombre or len(str(nombre).strip()) < 3:
        return jsonify({"error": "nombre debe tener al menos 3 caracteres"}), 400

    if not email or not EMAIL_RE.match(str(email)):
        return jsonify({"error": "email inválido"}), 400

    if not password or len(str(password)) < 8:
        return jsonify({"error": "password debe tener al menos 8 caracteres"}), 400

    if Usuario.query.filter_by(email=email).first():
        return jsonify({"error": "Ese correo ya está registrado"}), 400

    usuario = Usuario(
        nombre=nombre,
        email=email,
        rol="ciudadano",  # el rol nunca se acepta del cliente; solo un admin lo puede elevar despues
    )
    usuario.set_password(password)
    db.session.add(usuario)
    db.session.commit()
    return jsonify(usuario.to_dict()), 201


@bp.post("/login")
def login():
    """
    Iniciar sesión y obtener un token JWT.
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              example: admin@firewatchqro.mx
            password:
              type: string
              example: admin123
    responses:
      200:
        description: Token de acceso y datos del usuario
      401:
        description: Credenciales incorrectas
    """
    data = request.get_json(force=True)
    usuario = Usuario.query.filter_by(email=data.get("email")).first()

    if not usuario or not usuario.check_password(data.get("password", "")):
        return jsonify({"error": "Correo o contraseña incorrectos"}), 401

    token = create_access_token(identity=str(
        usuario.id), additional_claims={"rol": usuario.rol})
    return jsonify({"access_token": token, "usuario": usuario.to_dict()})


@bp.get("/perfil")
@jwt_required()
def perfil():
    """
    Obtener el perfil del usuario autenticado.
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Datos del usuario
      401:
        description: Token no proporcionado o inválido
    """
    usuario_id = get_jwt_identity()
    usuario = Usuario.query.get_or_404(usuario_id)
    return jsonify(usuario.to_dict())
