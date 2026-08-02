FROM python:3.10-slim

WORKDIR /app

# Evita que Python genere archivos .pyc y fuerce salida en texto plano
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Arranca el servidor Flask.
# La inicialización de la BD la hace el servicio one-shot "db-init"
# del docker-compose para evitar carreras entre réplicas.
CMD ["python", "run.py"]

