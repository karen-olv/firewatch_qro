from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def roles_required(*roles):
    """Requiere un JWT válido cuyo claim 'rol' esté en `roles`."""

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get("rol") not in roles:
                return jsonify({"error": "No tienes permiso para esta acción"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
