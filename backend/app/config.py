import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Por defecto apunta a PostgreSQL expuesto en la red privada de Docker.
    # Dentro de Docker, docker-compose sobreescribe con db:5432.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql+psycopg2://firewatch_user:firewatch_pass'
        '@localhost:5432/firewatch_qro'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key")

    # Redis: usado por los workers flask1/flask2 para procesar reportes
    # críticos (cola "reportes_criticos") y generar Incendio + Alerta.
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Rate limiting (Flask-Limiter) comparte el mismo Redis entre las 3
    # réplicas de la API -- un cliente balanceado entre api1/api2/api3 ve
    # un único contador real, no uno por réplica.
    RATELIMIT_STORAGE_URI = REDIS_URL
    RATELIMIT_ENABLED = os.getenv("TESTING") != "1"
