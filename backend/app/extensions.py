from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter

from app.rate_limit import get_real_client_ip

db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(key_func=get_real_client_ip, default_limits=["100 per minute"])
