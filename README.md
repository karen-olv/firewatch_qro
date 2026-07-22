# FireWatch QRO — Dashboard web

Proyecto de ejemplo con:
- **backend/** → API en Python + Flask + SQLAlchemy + MySQL
- **frontend/** → Dashboard web en React (Vite) conectado a la API real

Todo corre en tu computadora, en dos terminales separadas (una para el backend, otra para el frontend).

---

## 0. Requisitos previos

Antes de empezar, instala en tu compu (si no los tienes):

- **Python 3.10+** → https://www.python.org/downloads/
- **Node.js 18+** (incluye npm) → https://nodejs.org/
- **MySQL Server** → https://dev.mysql.com/downloads/mysql/ (o usa XAMPP/MAMP si ya lo tienes instalado así)

Verifica que estén instalados abriendo una terminal y corriendo:
```bash
python --version
node --version
mysql --version
```

---

## 1. Crear la base de datos en MySQL

Abre una terminal y entra a MySQL (te va a pedir la contraseña de root que pusiste al instalarlo):
```bash
mysql -u root -p
```

Dentro de MySQL, crea la base de datos y un usuario para el proyecto:
```sql
CREATE DATABASE firewatch_qro CHARACTER SET utf8mb4;
CREATE USER 'firewatch_user'@'localhost' IDENTIFIED BY 'firewatch_pass';
GRANT ALL PRIVILEGES ON firewatch_qro.* TO 'firewatch_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> Puedes cambiar el usuario/contraseña por los que quieras, solo asegúrate de que coincidan con el archivo `.env` del backend (paso 2).

---

## 2. Levantar el backend (Flask)

```bash
cd backend

# crear entorno virtual
python -m venv venv

# activarlo:
# en Mac/Linux:
source venv/bin/activate
# en Windows (PowerShell):
venv\Scripts\Activate.ps1

# instalar dependencias
pip install -r requirements.txt

# copiar el archivo de variables de entorno y ajustarlo si cambiaste usuario/password
cp .env.example .env    # en Windows: copy .env.example .env

# crear las tablas y llenarlas con datos de ejemplo (municipios, incendios, alertas...)
python seed.py

# levantar el servidor
python run.py
```

Si todo salió bien, verás algo como:
```
* Running on http://127.0.0.1:5000
```

Prueba que funcione abriendo en el navegador: **http://localhost:5000/api/salud**
Debe responder `{"status": "ok", ...}`.

### Endpoints principales de la API

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/estadisticas/resumen` | KPIs del dashboard |
| GET | `/api/estadisticas/top-municipios` | Ranking de municipios con más incendios |
| GET | `/api/estadisticas/tendencia?meses=12` | Serie histórica para la gráfica |
| GET | `/api/incendios?estado=activo` | Incendios activos (para el mapa) |
| GET | `/api/alertas` | Alertas activas |
| GET | `/api/reportes` | Reportes ciudadanos recientes |
| POST | `/api/reportes` | Crear un reporte (lo usaría la app móvil) |
| PATCH | `/api/reportes/<id>/validar` | Marcar un reporte como validado |
| POST | `/api/auth/login` | Login (regresa un token JWT) |
| POST | `/api/auth/registro` | Crear usuario |

Usuario de prueba creado por el seed: `admin@firewatchqro.mx` / `admin123`

---

## 3. Levantar el frontend (React)

Abre **otra terminal** (deja la de Flask corriendo) y ejecuta:

```bash
cd frontend
npm install
cp .env.example .env    # en Windows: copy .env.example .env
npm run dev
```

Vite te va a dar una URL, normalmente **http://localhost:5173**. Ábrela en el navegador y ahí verás el dashboard ya conectado a tu API con los datos que sembraste en MySQL.

---

## 4. Estructura del proyecto

```
firewatch/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # crea la app Flask y registra las rutas
│   │   ├── config.py          # lee las variables de entorno (.env)
│   │   ├── extensions.py      # instancias compartidas (db, jwt)
│   │   ├── models.py          # tablas: Municipio, Zona, Incendio, Reporte, Alerta, Usuario
│   │   └── routes/
│   │       ├── incendios.py
│   │       ├── reportes.py
│   │       ├── alertas.py
│   │       ├── estadisticas.py
│   │       ├── auth.py
│   │       └── usuarios.py
│   ├── seed.py                 # crea tablas + datos de ejemplo
│   ├── run.py                  # arranca el servidor
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx              # el dashboard completo
    │   ├── App.css              # estilos
    │   └── api.js                # funciones que llaman a la API
    ├── .env.example
    └── package.json
```

---

## 5. Siguientes pasos sugeridos

- **Conectar la app móvil**: cuando un usuario reporte un incendio desde el celular, tu app debería hacer un `POST` a `/api/reportes` con los mismos campos que usa el seed (`nombre_reportante`, `zona_id`, `descripcion`, `es_critico`).
- **Mapa real**: ahora mismo el mapa es una representación simplificada con puntos posicionados por coordenadas. Si quieres un mapa real con calles y polígonos, se puede integrar **Leaflet** (gratis, con capas de OpenStreetMap) — puedo ayudarte a agregarlo cuando quieras.
- **Autenticación en el dashboard**: ya existe `/api/auth/login`, falta conectar una pantalla de login en el frontend y proteger las rutas de administración.
- **Notificaciones en tiempo real**: para que las alertas aparezcan sin recargar, se puede agregar WebSockets (Flask-SocketIO) en vez de solo refrescar cada 30 segundos.
