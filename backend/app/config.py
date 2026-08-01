import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Por defecto apunta a MySQL expuesto en el host (puerto 3307).
    # Dentro de Docker, docker-compose sobreescribe con db:3306.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://firewatch_user:firewatch_pass'
        '@localhost:3307/firewatch_qro'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key")
