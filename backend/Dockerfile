FROM python:3.10-slim

WORKDIR /app

# Evita que Python genere archivos .pyc y fuerce salida en texto plano
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# 1) Crea/actualiza tablas y siembra datos demo si hace falta
# 2) Arranca el servidor Flask
CMD ["sh", "-c", "python init_db.py && python run.py"]

