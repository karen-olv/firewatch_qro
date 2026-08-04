from datetime import datetime
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class Municipio(db.Model):
    __tablename__ = "municipios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), unique=True, nullable=False)

    zonas = db.relationship("Zona", backref="municipio", lazy=True)

    def to_dict(self):
        return {"id": self.id, "nombre": self.nombre}


class Zona(db.Model):
    __tablename__ = "zonas"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    municipio_id = db.Column(db.Integer, db.ForeignKey("municipios.id"), nullable=False)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "municipio": self.municipio.nombre if self.municipio else None,
            "lat": self.lat,
            "lng": self.lng,
        }


class Incendio(db.Model):
    __tablename__ = "incendios"

    NIVELES = ("bajo", "medio", "alto")
    ESTADOS = ("activo", "contenido", "controlado")

    id = db.Column(db.Integer, primary_key=True)
    zona_id = db.Column(db.Integer, db.ForeignKey("zonas.id"), nullable=False)
    nivel_riesgo = db.Column(db.String(10), nullable=False, default="bajo")
    estado = db.Column(db.String(15), nullable=False, default="activo")
    descripcion = db.Column(db.Text, nullable=True)
    fuente = db.Column(db.String(50), nullable=True)  # sensor | ciudadano
    fecha_deteccion = db.Column(db.DateTime, default=datetime.utcnow)

    zona = db.relationship("Zona")
    reportes = db.relationship("Reporte", backref="incendio", lazy=True)
    alertas = db.relationship("Alerta", backref="incendio", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "zona": self.zona.nombre if self.zona else None,
            "municipio": self.zona.municipio.nombre if self.zona and self.zona.municipio else None,
            "lat": self.zona.lat if self.zona else None,
            "lng": self.zona.lng if self.zona else None,
            "nivel_riesgo": self.nivel_riesgo,
            "estado": self.estado,
            "descripcion": self.descripcion,
            "fuente": self.fuente,
            "fecha_deteccion": self.fecha_deteccion.isoformat() if self.fecha_deteccion else None,
        }


class Reporte(db.Model):
    __tablename__ = "reportes"

    id = db.Column(db.Integer, primary_key=True)
    nombre_reportante = db.Column(db.String(150), nullable=False)
    zona_id = db.Column(db.Integer, db.ForeignKey("zonas.id"), nullable=True)
    incendio_id = db.Column(db.Integer, db.ForeignKey("incendios.id"), nullable=True)
    descripcion = db.Column(db.Text, nullable=True)
    es_critico = db.Column(db.Boolean, default=False)
    validado = db.Column(db.Boolean, default=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    foto = db.Column(db.Text, nullable=True)  # imagen en base64, enviada desde la app movil

    zona = db.relationship("Zona")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre_reportante": self.nombre_reportante,
            "municipio": self.zona.municipio.nombre if self.zona and self.zona.municipio else None,
            "zona": self.zona.nombre if self.zona else None,
            "descripcion": self.descripcion,
            "lat": self.lat,
            "lng": self.lng,
            "foto": self.foto,
            "es_critico": self.es_critico,
            "validado": self.validado,
            "fecha": self.fecha.isoformat() if self.fecha else None,
        }


class Alerta(db.Model):
    __tablename__ = "alertas"

    id = db.Column(db.Integer, primary_key=True)
    incendio_id = db.Column(db.Integer, db.ForeignKey("incendios.id"), nullable=False)
    nivel = db.Column(db.String(10), nullable=False, default="bajo")
    descripcion = db.Column(db.Text, nullable=True)
    enviada_a = db.Column(db.String(150), nullable=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "zona": self.incendio.zona.nombre if self.incendio and self.incendio.zona else None,
            "municipio": self.incendio.zona.municipio.nombre
            if self.incendio and self.incendio.zona and self.incendio.zona.municipio
            else None,
            "nivel": self.nivel,
            "descripcion": self.descripcion,
            "enviada_a": self.enviada_a,
            "lat": self.incendio.zona.lat if self.incendio and self.incendio.zona else None,
            "lng": self.incendio.zona.lng if self.incendio and self.incendio.zona else None,
            "fecha": self.fecha.isoformat() if self.fecha else None,
        }


class Usuario(db.Model):
    __tablename__ = "usuarios"

    ROLES = ("admin", "proteccion_civil", "ciudadano")

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default="ciudadano")
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "rol": self.rol,
            "fecha_registro": self.fecha_registro.isoformat() if self.fecha_registro else None,
        }
