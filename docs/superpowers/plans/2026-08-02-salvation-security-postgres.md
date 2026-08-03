# Salvation: Security Fixes + PostgreSQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close JWT/validation/port-exposure gaps found in the rubric audit and migrate the database engine from MySQL to PostgreSQL, all on the local-only `Salvation` branch.

**Architecture:** Flask backend (`backend/app/`) with Flask-SQLAlchemy ORM and Flask-JWT-Extended; React frontend; Expo mobile app; Docker Compose orchestrates `public_net`/`private_net` with HAProxy as the sole public entry point. No app code touches raw SQL — the Postgres migration is a config/driver swap, not a schema rewrite.

**Tech Stack:** Python 3 / Flask 3.0.3 / Flask-SQLAlchemy 3.1.1 / Flask-JWT-Extended 4.6.0 / pytest (new, test-only) / psycopg2-binary (new) / PostgreSQL 16 / prometheuscommunity/postgres-exporter / Docker Compose.

## Global Constraints

- Local Docker deployment only — no cloud/remote hosting changes.
- No new runtime dependencies beyond `psycopg2-binary` (replaces `PyMySQL`) and `pytest` (test-only, dev dependency).
- No secret rotation — untrack going forward, keep current values (explicit user decision).
- `POST /api/reportes` and `POST /api/auth/registro` stay unauthenticated by design — do not add `@jwt_required()` to them.
- `POST /api/incendios` and `POST /api/alertas` require role `admin` or `proteccion_civil`. `GET /api/usuarios` requires any valid JWT, no role restriction.
- No production data exists — migration recreates the database from `seed.py`, it does not copy rows.

---

### Task 1: JWT role protection on incendios/alertas/usuarios

**Files:**
- Create: `backend/app/auth_utils.py`
- Modify: `backend/app/routes/incendios.py:1-6,36` (imports + decorator on `crear_incendio`)
- Modify: `backend/app/routes/alertas.py:1-5,23` (imports + decorator on `crear_alerta`)
- Modify: `backend/app/routes/usuarios.py:1-7` (imports + decorator on `listar_usuarios`)
- Create: `backend/tests/__init__.py` (empty)
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_auth_protection.py`

**Interfaces:**
- Produces: `roles_required(*roles)` decorator in `backend/app/auth_utils.py`, importable as `from app.auth_utils import roles_required`. Applies `@jwt_required()` internally, then checks `get_jwt()["rol"] in roles`, returning `403` with `{"error": "No tienes permiso para esta acción"}` on mismatch.
- Produces: `backend/tests/conftest.py` fixtures `app` and `client`, reused by Task 2's tests.

- [ ] **Step 1: Write `backend/tests/conftest.py`**

```python
import pytest

from app import create_app
from app.extensions import db
from app.models import Usuario


@pytest.fixture
def app():
    flask_app = create_app()
    flask_app.config.update(
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        TESTING=True,
        JWT_SECRET_KEY="test-secret",
    )
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def make_user(app, email, rol):
    with app.app_context():
        usuario = Usuario(nombre="Test User", email=email, rol=rol)
        usuario.set_password("password123")
        db.session.add(usuario)
        db.session.commit()
        return usuario.id


def login(client, email, password="password123"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["access_token"]
```

- [ ] **Step 2: Write `backend/tests/test_auth_protection.py` (failing tests)**

```python
from tests.conftest import make_user, login


def test_crear_incendio_sin_token_devuelve_401(client):
    resp = client.post("/api/incendios", json={"zona_id": 1})
    assert resp.status_code == 401


def test_crear_incendio_con_rol_ciudadano_devuelve_403(app, client):
    make_user(app, "ciudadano@test.com", "ciudadano")
    token = login(client, "ciudadano@test.com")
    resp = client.post(
        "/api/incendios",
        json={"zona_id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_crear_incendio_con_rol_admin_falla_por_zona_inexistente_no_por_auth(app, client):
    make_user(app, "admin@test.com", "admin")
    token = login(client, "admin@test.com")
    resp = client.post(
        "/api/incendios",
        json={"zona_id": 999},
        headers={"Authorization": f"Bearer {token}"},
    )
    # zona 999 no existe en una BD vacía -> 404, no 401/403.
    # Confirma que el rol admin sí pasa el gate de autorización.
    assert resp.status_code == 404


def test_crear_alerta_sin_token_devuelve_401(client):
    resp = client.post("/api/alertas", json={"incendio_id": 1})
    assert resp.status_code == 401


def test_crear_alerta_con_rol_proteccion_civil_pasa_gate(app, client):
    make_user(app, "pc@test.com", "proteccion_civil")
    token = login(client, "pc@test.com")
    resp = client.post(
        "/api/alertas",
        json={"incendio_id": 999},
        headers={"Authorization": f"Bearer {token}"},
    )
    # incendio 999 no existe -> 400 (validación de negocio), no 401/403.
    assert resp.status_code == 400


def test_listar_usuarios_sin_token_devuelve_401(client):
    resp = client.get("/api/usuarios")
    assert resp.status_code == 401


def test_listar_usuarios_con_cualquier_rol_devuelve_200(app, client):
    make_user(app, "cualquiera@test.com", "ciudadano")
    token = login(client, "cualquiera@test.com")
    resp = client.get("/api/usuarios", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
```

- [ ] **Step 3: Run tests to verify they fail**

Run (from `backend/`): `python -m pytest tests/test_auth_protection.py -v`
Expected: FAIL — all six tests fail because the endpoints currently accept unauthenticated requests (no 401/403 returned).

- [ ] **Step 4: Write `backend/app/auth_utils.py`**

```python
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
```

- [ ] **Step 5: Apply the decorator in `backend/app/routes/incendios.py`**

Modify the imports (lines 1-4) to add:

```python
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Incendio, Zona  # <-- Importamos Zona
from app.auth_utils import roles_required
from datetime import datetime         # <-- Importamos datetime
```

Modify line 36 (`def crear_incendio():`) to add the decorator directly above it:

```python
@bp.post("")
@roles_required("admin", "proteccion_civil")
def crear_incendio():
```

- [ ] **Step 6: Apply the decorator in `backend/app/routes/alertas.py`**

Modify the imports (lines 1-4) to add:

```python
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Alerta, Incendio
from app.auth_utils import roles_required
```

Modify line 23 (`def crear_alerta():`) to add the decorator directly above it:

```python
@bp.post("")
@roles_required("admin", "proteccion_civil")
def crear_alerta():
```

- [ ] **Step 7: Apply the decorator in `backend/app/routes/usuarios.py`**

Replace the whole file:

```python
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models import Usuario

bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


@bp.get("")
@jwt_required()
def listar_usuarios():
    """
    Listar todos los usuarios registrados.
    ---
    tags:
      - Usuarios
    security:
      - Bearer: []
    responses:
      200:
        description: Lista de usuarios
      401:
        description: Token no proporcionado o inválido
    """
    usuarios = Usuario.query.order_by(Usuario.fecha_registro.desc()).all()
    return jsonify([u.to_dict() for u in usuarios])
```

- [ ] **Step 8: Add `pytest` to `backend/requirements.txt`**

Append to the end of `backend/requirements.txt`:

```
pytest==8.3.2
```

- [ ] **Step 9: Install pytest and run tests to verify they pass**

Run (from `backend/`): `pip install pytest==8.3.2` then `python -m pytest tests/test_auth_protection.py -v`
Expected: PASS — all six tests pass.

- [ ] **Step 10: Commit**

```bash
git add backend/app/auth_utils.py backend/app/routes/incendios.py backend/app/routes/alertas.py backend/app/routes/usuarios.py backend/requirements.txt backend/tests/
git commit -m "feat: require admin/proteccion_civil JWT role on incendios/alertas writes, JWT on usuarios list"
```

---

### Task 2: Server-side validation on reportes and registro

**Files:**
- Modify: `backend/app/routes/reportes.py:74-86` (add validation block)
- Modify: `backend/app/routes/auth.py:1,46-50` (add validation block + `re` import)
- Create: `backend/tests/test_validation.py`

**Interfaces:**
- Consumes: `client` fixture from `backend/tests/conftest.py` (Task 1).
- Produces: nothing consumed by later tasks — this is a leaf task.

- [ ] **Step 1: Write `backend/tests/test_validation.py` (failing tests)**

```python
def _seed_zona(app):
    from app.extensions import db
    from app.models import Municipio, Zona

    with app.app_context():
        municipio = Municipio(nombre="Test Municipio")
        db.session.add(municipio)
        db.session.flush()
        zona = Zona(nombre="Test Zona", municipio_id=municipio.id)
        db.session.add(zona)
        db.session.commit()
        return zona.id


def test_crear_reporte_con_descripcion_corta_devuelve_400(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes", json={"zona_id": zona_id, "descripcion": "corto"}
    )
    assert resp.status_code == 400


def test_crear_reporte_con_descripcion_larga_devuelve_400(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={"zona_id": zona_id, "descripcion": "x" * 501},
    )
    assert resp.status_code == 400


def test_crear_reporte_valido_devuelve_201(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={"zona_id": zona_id, "descripcion": "Descripcion valida de prueba"},
    )
    assert resp.status_code == 201


def test_crear_reporte_con_nombre_corto_devuelve_400(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={
            "zona_id": zona_id,
            "descripcion": "Descripcion valida de prueba",
            "nombre_reportante": "Al",
        },
    )
    assert resp.status_code == 400


def test_crear_reporte_con_zona_id_no_entero_devuelve_400(client):
    resp = client.post(
        "/api/reportes",
        json={"zona_id": "no-es-un-entero", "descripcion": "Descripcion valida de prueba"},
    )
    assert resp.status_code == 400


def test_registro_con_password_corto_devuelve_400(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Juan Perez", "email": "juan@test.com", "password": "corto"},
    )
    assert resp.status_code == 400


def test_registro_con_email_invalido_devuelve_400(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Juan Perez", "email": "no-es-un-email", "password": "password123"},
    )
    assert resp.status_code == 400


def test_registro_con_nombre_corto_devuelve_400(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Al", "email": "juan@test.com", "password": "password123"},
    )
    assert resp.status_code == 400


def test_registro_valido_devuelve_201(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Juan Perez", "email": "juan@test.com", "password": "password123"},
    )
    assert resp.status_code == 201
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `python -m pytest tests/test_validation.py -v`
Expected: FAIL on the `400`-expecting tests (current code only checks presence, not length/format); the `201`-expecting tests already pass.

- [ ] **Step 3: Add validation to `backend/app/routes/reportes.py`**

Modify lines 74-86 (replace the block starting at `data = request.get_json(force=True)` through the zona-exists check):

```python
    data = request.get_json(force=True)

    # 1. Validar que mandaron los datos mínimos obligatorios
    if not data or not data.get('zona_id') or not data.get('descripcion'):
        return jsonify(
            {"error": "Faltan datos obligatorios (zona_id, descripcion)"}
        ), 400

    # 2. Validar formato/longitud de los campos
    zona_id = data.get('zona_id')
    if not isinstance(zona_id, int):
        return jsonify({"error": "zona_id debe ser un entero"}), 400

    descripcion = data.get('descripcion')
    if not isinstance(descripcion, str) or not (10 <= len(descripcion.strip()) <= 500):
        return jsonify(
            {"error": "descripcion debe tener entre 10 y 500 caracteres"}
        ), 400

    nombre_reportante = data.get("nombre_reportante", data.get("nombre"))
    if nombre_reportante and len(str(nombre_reportante).strip()) < 3:
        return jsonify(
            {"error": "nombre_reportante debe tener al menos 3 caracteres"}
        ), 400

    # 3. Validar que la zona_id realmente exista en tu BD
    zona_existe = Zona.query.get(zona_id)
    if not zona_existe:
        return jsonify({"error": f"La zona con ID {zona_id} no exist."}), 404
```

- [ ] **Step 4: Add validation to `backend/app/routes/auth.py`**

Modify line 1 to add the `re` import:

```python
import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Usuario

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
```

Modify lines 46-50 (the `registro()` body, replacing from `data = request.get_json(force=True)` through the "ya registrado" check):

```python
    data = request.get_json(force=True)

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
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `backend/`): `python -m pytest tests/test_validation.py -v`
Expected: PASS — all nine tests pass.

- [ ] **Step 6: Run the full backend test suite to check for regressions**

Run (from `backend/`): `python -m pytest -v`
Expected: PASS — all tests from Task 1 and Task 2 pass together.

- [ ] **Step 7: Commit**

```bash
git add backend/app/routes/reportes.py backend/app/routes/auth.py backend/tests/test_validation.py
git commit -m "feat: add server-side length/format validation to reportes and registro"
```

---

### Task 3: Untrack leaked secrets

**Files:**
- Modify: `.gitignore`
- Untrack (git-only, no content change): `backend/.env`, `deploy/ssl/certs/firewatch.key`, `deploy/ssl/certs/firewatch.pem`

**Interfaces:**
- None — this task doesn't produce interfaces consumed elsewhere.

- [ ] **Step 1: Verify current tracked state**

Run: `git ls-files | grep -E "backend/\.env$|deploy/ssl/certs/firewatch\.(key|pem)$"`
Expected output (three lines):
```
backend/.env
deploy/ssl/certs/firewatch.key
deploy/ssl/certs/firewatch.pem
```

- [ ] **Step 2: Update `.gitignore`**

`.gitignore` already ignores `backend/.env` (line 7) — that's why new clones won't re-add it once untracked. Add SSL key/pem ignores. Modify the file to add a new section after the existing "Logs" section:

```
# Python
__pycache__/
*.pyc
venv/
backend/venv/
.env
backend/.env

# Node
node_modules/

# VS Code
.vscode/

# Logs
*.log

# Secretos SSL (clave privada y bundle combinado) - el .crt público se mantiene
deploy/ssl/certs/*.key
deploy/ssl/certs/*.pem
```

- [ ] **Step 3: Untrack the files**

```bash
git rm --cached backend/.env deploy/ssl/certs/firewatch.key deploy/ssl/certs/firewatch.pem
```

Expected output: three `rm 'path'` lines. The files stay on disk (only removed from git's index).

- [ ] **Step 4: Verify they're gone from tracking but still on disk**

Run: `git ls-files | grep -E "backend/\.env$|deploy/ssl/certs/firewatch\.(key|pem)$"`
Expected: no output (empty).

Run: `ls backend/.env deploy/ssl/certs/firewatch.key deploy/ssl/certs/firewatch.pem`
Expected: all three files still exist on disk.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: stop tracking backend/.env and SSL private key/bundle (still present in git history — rotate before any real deploy)"
```

---

### Task 4: Stop exposing private ports to host

**Files:**
- Modify: `docker-compose.yml:101-102,121-122,141-142,167-168,189-190`

**Interfaces:**
- None.

- [ ] **Step 1: Remove `ports:` from `api1`**

In `docker-compose.yml`, find the `api1` service block:

```yaml
    networks:
      - private_net
    expose:
      - "5000"
    ports:
      - "8001:5000"
```

Replace with:

```yaml
    networks:
      - private_net
    expose:
      - "5000"
```

- [ ] **Step 2: Remove `ports:` from `api2`**

Find:

```yaml
    networks:
      - private_net
    expose:
      - "5000"
    ports:
      - "8002:5000"
```

Replace with:

```yaml
    networks:
      - private_net
    expose:
      - "5000"
```

- [ ] **Step 3: Remove `ports:` from `api3`**

Find:

```yaml
    networks:
      - private_net
    expose:
      - "5000"
    ports:
      - "8003:5000"
```

Replace with:

```yaml
    networks:
      - private_net
    expose:
      - "5000"
```

- [ ] **Step 4: Remove `ports:` from `flask1`**

Find:

```yaml
    networks:
      - private_net
    expose:
      - "5001"
    ports:
      - "5001:5001"
```

Replace with:

```yaml
    networks:
      - private_net
    expose:
      - "5001"
```

- [ ] **Step 5: Remove `ports:` from `flask2`**

Find:

```yaml
    networks:
      - private_net
    expose:
      - "5002"
    ports:
      - "5002:5002"
```

Replace with:

```yaml
    networks:
      - private_net
    expose:
      - "5002"
```

- [ ] **Step 6: Validate compose file syntax**

Run: `docker compose config --quiet`
Expected: no output, exit code 0 (confirms valid YAML and no leftover `ports:` parse errors). Full functional verification (that `curl localhost:8001` now fails) happens in Task 6, after the Postgres migration, in one combined `docker compose up`.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml
git commit -m "fix: stop publishing api1-3/flask1-2 ports directly to host, route all traffic through HAProxy"
```

---

### Task 5: MySQL to PostgreSQL migration

**Files:**
- Modify: `backend/requirements.txt:5`
- Modify: `backend/app/config.py:8-14`
- Modify: `backend/.env.example:3-7`
- Modify: `docker-compose.yml` (`volumes:` top-level, `db` service, `db-init` env, `&api_env` anchor, `mysqld-exporter` service)
- Modify: `monitoring/prometheus/prometheus.yml:23-26`
- Modify: `monitoring/grafana/provisioning/dashboards/firewatch.json:134-139`
- Delete: `db/init.sql`
- Delete: `Mysql BD/firewatch_qro.sql`
- Delete: `monitoring/mysql/.my.cnf`

**Interfaces:**
- None — this task is infra/config only, no code interfaces.

- [ ] **Step 1: Swap the driver in `backend/requirements.txt`**

Modify line 5 (`PyMySQL==1.1.1`) to:

```
psycopg2-binary==2.9.9
```

- [ ] **Step 2: Update the default connection string in `backend/app/config.py`**

Replace lines 8-14:

```python
    # Por defecto apunta a PostgreSQL expuesto en la red privada de Docker.
    # Dentro de Docker, docker-compose sobreescribe con db:5432.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql+psycopg2://firewatch_user:firewatch_pass'
        '@localhost:5432/firewatch_qro'
    )
```

- [ ] **Step 3: Update `backend/.env.example`**

Replace lines 3-7:

```
# Cadena de conexión a PostgreSQL.
#   - Dentro de Docker -> docker-compose inyecta db:5432 automáticamente.
DATABASE_URL=postgresql+psycopg2://firewatch_user:firewatch_pass@localhost:5432/firewatch_qro
```

- [ ] **Step 4: Update the top-level `volumes:` block in `docker-compose.yml`**

Replace:

```yaml
volumes:
  mysql_data:
  grafana_data:
  prometheus_data:
  firewall_textfile:
```

With:

```yaml
volumes:
  pg_data:
  grafana_data:
  prometheus_data:
  firewall_textfile:
```

- [ ] **Step 5: Replace the `db` service in `docker-compose.yml`**

Replace the entire `db` service block (from `  db:` through the `healthcheck:` block ending before the blank line and `redis:`):

```yaml
  db:
    image: postgres:16-alpine
    container_name: firewatch_db
    restart: always
    environment:
      POSTGRES_DB: firewatch_qro
      POSTGRES_USER: firewatch_user
      POSTGRES_PASSWORD: firewatch_pass
    volumes:
      - pg_data:/var/lib/postgresql/data
    networks:
      - private_net
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U firewatch_user -d firewatch_qro"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
```

Also update the comment above it from `#  RED PRIVADA 1/2: MySQL + Redis` to `#  RED PRIVADA 1/2: PostgreSQL + Redis`.

- [ ] **Step 6: Update `DATABASE_URL` in the `db-init` service**

Change:

```yaml
    environment:
      DATABASE_URL: mysql+pymysql://firewatch_user:firewatch_pass@db:3306/firewatch_qro
```

To:

```yaml
    environment:
      DATABASE_URL: postgresql+psycopg2://firewatch_user:firewatch_pass@db:5432/firewatch_qro
```

- [ ] **Step 7: Update `DATABASE_URL` in the `&api_env` anchor**

Change:

```yaml
  api1:
    build: ./backend
    container_name: api1
    restart: always
    environment: &api_env
      DATABASE_URL: mysql+pymysql://firewatch_user:firewatch_pass@db:3306/firewatch_qro
```

To:

```yaml
  api1:
    build: ./backend
    container_name: api1
    restart: always
    environment: &api_env
      DATABASE_URL: postgresql+psycopg2://firewatch_user:firewatch_pass@db:5432/firewatch_qro
```

- [ ] **Step 8: Replace the `mysqld-exporter` service with `postgres-exporter`**

Replace:

```yaml
  mysqld-exporter:
    image: prom/mysqld-exporter:v0.15.1
    container_name: firewatch_mysqld_exporter
    restart: always
    environment:
      # v0.15.x lee las credenciales desde el archivo .my.cnf
      - MYSQLD_EXPORTER_PASSWORD=exporter_pass
    command:
      - '--config.my-cnf=/etc/mysql/.my.cnf'
    volumes:
      - ./monitoring/mysql/.my.cnf:/etc/mysql/.my.cnf:ro
    depends_on:
      db:
        condition: service_healthy
    networks:
      - private_net
    expose:
      - "9104"
```

With:

```yaml
  postgres-exporter:
    image: quay.io/prometheuscommunity/postgres-exporter:v0.15.0
    container_name: firewatch_postgres_exporter
    restart: always
    environment:
      - DATA_SOURCE_NAME=postgresql://firewatch_user:firewatch_pass@db:5432/firewatch_qro?sslmode=disable
    depends_on:
      db:
        condition: service_healthy
    networks:
      - private_net
    expose:
      - "9187"
```

- [ ] **Step 9: Update `monitoring/prometheus/prometheus.yml`**

Replace:

```yaml
  # MySQL
  - job_name: "mysql"
    static_configs:
      - targets: ["mysqld-exporter:9104"]
```

With:

```yaml
  # PostgreSQL
  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]
```

- [ ] **Step 10: Update the Grafana dashboard panel**

Open `monitoring/grafana/provisioning/dashboards/firewatch.json`, find (around line 134):

```json
                    "expr": "up{job=\"mysql\"}",
                    "legendFormat": "MySQL",
```

Replace with:

```json
                    "expr": "up{job=\"postgres\"}",
                    "legendFormat": "PostgreSQL",
```

And find (around line 139):

```json
            "title": "MySQL disponible",
```

Replace with:

```json
            "title": "PostgreSQL disponible",
```

- [ ] **Step 11: Delete stray MySQL-only files**

```bash
rm "db/init.sql" "Mysql BD/firewatch_qro.sql" "monitoring/mysql/.my.cnf"
rmdir "Mysql BD" "monitoring/mysql" 2>/dev/null || true
```

- [ ] **Step 12: Remove the now-dangling `db/init.sql` volume mount from `docker-compose.yml`**

This was already dropped in Step 5's full-block replacement of the `db` service (the old block mounted `./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro`; the new block has no such mount). Confirm it's gone:

Run: `grep -n "init.sql" docker-compose.yml`
Expected: no output.

- [ ] **Step 13: Validate compose file syntax**

Run: `docker compose config --quiet`
Expected: no output, exit code 0.

- [ ] **Step 14: Commit**

```bash
git add backend/requirements.txt backend/app/config.py backend/.env.example docker-compose.yml monitoring/prometheus/prometheus.yml monitoring/grafana/provisioning/dashboards/firewatch.json
git rm -r "db/init.sql" "Mysql BD" "monitoring/mysql"
git commit -m "feat: migrate database from MySQL to PostgreSQL (driver, docker-compose, exporter, prometheus/grafana)"
```

---

### Task 6: Full-stack verification

**Files:**
- None modified — this task only runs and verifies the stack built by Tasks 1-5.

**Interfaces:**
- Consumes: everything from Tasks 1-5.

- [ ] **Step 1: Clean rebuild from scratch**

```bash
docker compose down -v
docker compose up -d --build
```

Expected: no build errors. `psycopg2-binary` compiles/installs cleanly in the `backend` image.

- [ ] **Step 2: Wait for health and check container status**

Run: `docker compose ps`
Expected: `db` shows `healthy`, `api1`/`api2`/`api3` show `Up`, `db-init` shows `Exited (0)`.

- [ ] **Step 3: Verify the API is reachable through HAProxy only**

Run: `curl -s http://localhost:8080/api/health`
Expected: `{"status":"ok","servicio":"FireWatch QRO API"}`

Run: `curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:8001/api/health || echo "connection failed as expected"`
Expected: connection failure (port 8001 no longer published to host).

- [ ] **Step 4: Verify JWT protection end-to-end against the live stack**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/incendios -H "Content-Type: application/json" -d '{"zona_id":1}'
```
Expected: `401`

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@firewatchqro.mx","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/incendios -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"zona_id":1}'
```
Expected: `201` (admin seeded by `seed.py`, zona 1 exists after seeding).

- [ ] **Step 5: Verify server-side validation end-to-end**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/reportes -H "Content-Type: application/json" -d '{"zona_id":1,"descripcion":"corto"}'
```
Expected: `400`

- [ ] **Step 6: Verify Postgres is the live database**

Run: `docker compose exec db psql -U firewatch_user -d firewatch_qro -c "\dt"`
Expected: lists tables `municipios`, `zonas`, `incendios`, `reportes`, `alertas`, `usuarios` (created by `init_db.py`'s `db.create_all()` and seeded by `seed.py`).

- [ ] **Step 7: Verify Grafana panel renders**

Open `https://localhost/` is out of scope for curl verification (self-signed cert + browser), but confirm the exporter is up:

Run: `curl -s http://localhost:9090/api/v1/query?query=up{job=%22postgres%22} 2>/dev/null || docker compose exec prometheus wget -qO- "http://localhost:9090/api/v1/query?query=up%7Bjob%3D%22postgres%22%7D"`
Expected: JSON response with `"value":["...","1"]` (target up).

- [ ] **Step 8: Run the full backend pytest suite one more time inside a clean checkout state**

Run (from `backend/`): `python -m pytest -v`
Expected: all tests from Task 1 and Task 2 pass.

- [ ] **Step 9: Tear down**

```bash
docker compose down
```

No commit for this task — it's verification only, no file changes.

---

### Task 7: Fix db-init double create_app() crash

**Files:**
- Modify: `backend/seed.py` (module-level `create_app()` call, `run()` function body)
- Modify: `backend/init_db.py:52-56` (no signature change needed — `seed_run()` call already sits inside an active `app.app_context()`)

**Interfaces:**
- Produces: `seed.run()` no longer creates its own Flask app or pushes its own app context — it assumes an app context is already active (matches how `init_db.py` already calls it, inside `with app.app_context():`).

**Background:** Task 6's live verification found that `backend/init_db.py` calls `create_app()` (module-level), and when the DB is empty it imports `backend/seed.py`, which ALSO calls `create_app()` at module level. Both `create_app()` calls run `PrometheusMetrics(app, ...)` (`backend/app/__init__.py:48`), which registers collectors against the process-global `prometheus_client` registry. Registering twice in the same process raises `prometheus_client.registry.DuplicateTimeseries`, crashing `db-init` before it seeds any data — nothing downstream (api1-3, workers, HAProxy) ever starts. This bug is pre-existing (not introduced by Tasks 1-5) but blocks Task 6's verification and the "Web+API+BD funcionando" requirement, so it must be fixed before Task 6 can pass.

- [ ] **Step 1: Read current `backend/seed.py` in full to confirm line numbers before editing**

Run: `cat backend/seed.py` (or read the file) — confirm the module-level `app = create_app()` is on line 15, and `def run():` opens with `with app.app_context():` on the next lines, ending with `db.session.commit()` and two `print(...)` calls, followed by `if __name__ == "__main__": run()`.

- [ ] **Step 2: Rewrite `backend/seed.py` so it doesn't create its own app when imported**

Replace the entire file with:

```python
"""
Llena la base de datos con datos de ejemplo
(municipios, zonas, incendios, reportes y alertas).

Uso standalone:
    python seed.py

Uso desde otro módulo (p. ej. init_db.py): llamar a run() dentro de un
app_context ya activo — run() no crea ni empuja su propio Flask app,
para evitar registrar las métricas de Prometheus dos veces en el mismo
proceso (ver backend/app/__init__.py -> PrometheusMetrics).
"""
from datetime import datetime, timedelta
import random

from app.extensions import db
from app.models import Municipio, Zona, Incendio, Reporte, Alerta, Usuario

MUNICIPIOS_ZONAS = {
    "Jalpan de Serra": [("Sierra Gorda - Núcleo", 21.2167, -99.4833)],
    "Landa de Matamoros": [("Landa Norte", 21.1667, -99.3333)],
    "Cadereyta de Montes": [("Cadereyta Centro", 20.6975, -99.8214)],
    "Pinal de Amoles": [("Pinal Alto", 21.1333, -99.6167)],
    "San Joaquín": [("San Joaquín Rural", 20.9333, -99.6167)],
    "Colón": [("Colón Oriente", 20.7867, -100.0611)],
    "Amealco de Bonfil": [("Amealco Sur", 20.1833, -100.1500)],
    "Ezequiel Montes": [("Peña de Bernal", 20.7500, -99.9500)],
    "Querétaro": [("Querétaro Capital", 20.5888, -100.3899)],
}


def run():
    """Siembra datos de ejemplo. Requiere un app_context ya activo."""
    db.drop_all()
    db.create_all()

    # --- municipios y zonas ---
    zonas_por_nombre = {}
    for municipio_nombre, zonas in MUNICIPIOS_ZONAS.items():
        municipio = Municipio(nombre=municipio_nombre)
        db.session.add(municipio)
        db.session.flush()  # para obtener el id sin hacer commit todavía

        for zona_nombre, lat, lng in zonas:
            zona = Zona(nombre=zona_nombre, municipio_id=municipio.id, lat=lat, lng=lng)
            db.session.add(zona)
            db.session.flush()
            zonas_por_nombre[zona_nombre] = zona

    # --- incendios de ejemplo (histórico de los últimos 24 meses) ---
    niveles = ["bajo", "medio", "alto"]
    zonas = list(zonas_por_nombre.values())
    incendios_creados = []
    for _ in range(60):
        zona = random.choice(zonas)
        dias_atras = random.randint(0, 720)
        incendio = Incendio(
            zona_id=zona.id,
            nivel_riesgo=random.choice(niveles),
            estado=random.choice(["activo", "contenido", "controlado"]),
            descripcion="Registro generado para pruebas y estadísticas.",
            fuente=random.choice(["sensor", "ciudadano"]),
            fecha_deteccion=datetime.utcnow() - timedelta(days=dias_atras),
        )
        db.session.add(incendio)
        db.session.flush()
        incendios_creados.append(incendio)

    # --- fuerza 3 incendios activos "de hoy" para que el dashboard se vea vivo ---
    for zona_nombre, nivel in [
        ("Sierra Gorda - Núcleo", "alto"),
        ("Peña de Bernal", "medio"),
        ("Amealco Sur", "bajo"),
    ]:
        zona = zonas_por_nombre[zona_nombre]
        incendio = Incendio(
            zona_id=zona.id,
            nivel_riesgo=nivel,
            estado="activo",
            descripcion="Incendio activo bajo monitoreo.",
            fuente="sensor",
            fecha_deteccion=datetime.utcnow() - timedelta(minutes=random.randint(10, 120)),
        )
        db.session.add(incendio)
        db.session.flush()
        incendios_creados.append(incendio)

        alerta = Alerta(
            incendio_id=incendio.id,
            nivel=nivel,
            descripcion="Alerta generada automáticamente por el sistema.",
            enviada_a="Protección Civil Querétaro",
        )
        db.session.add(alerta)

    # --- reportes ciudadanos de ejemplo ---
    nombres = ["María Elena Ruiz", "José Antonio Vega", "Guardia forestal #12", "Sensor térmico Z-06"]
    for nombre in nombres:
        zona = random.choice(zonas)
        reporte = Reporte(
            nombre_reportante=nombre,
            zona_id=zona.id,
            descripcion="Reporte de ejemplo para pruebas del dashboard.",
            es_critico=random.choice([True, False]),
            validado=random.choice([True, False]),
            fecha=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
        )
        db.session.add(reporte)

    # --- usuario admin de ejemplo ---
    admin = Usuario(nombre="Admin Protección Civil", email="admin@firewatchqro.mx", rol="admin")
    admin.set_password("admin123")
    db.session.add(admin)

    db.session.commit()
    print("Base de datos creada y sembrada con datos de ejemplo ✅")
    print("Usuario admin de prueba -> email: admin@firewatchqro.mx | password: admin123")


if __name__ == "__main__":
    from app import create_app

    app = create_app()
    with app.app_context():
        run()
```

- [ ] **Step 3: Confirm `backend/init_db.py` needs no change**

Read `backend/init_db.py:45-57` — `init_db()` already does:

```python
def init_db():
    with app.app_context():
        print("[init_db] Creando tablas...")
        db.create_all()

        if Municipio.query.first() is None:
            print("[init_db] BD vacía -> sembrando datos de ejemplo (seed)...")
            from seed import run as seed_run

            seed_run()
        else:
            print("[init_db] La BD ya tiene datos, no se vuelve a sembrar.")
```

`seed_run()` is already called inside `init_db.py`'s own `with app.app_context():` block — no change needed here. The bug was entirely `seed.py` creating a second app; Step 2 removes that.

- [ ] **Step 4: Verify standalone `python seed.py` still works against a real database**

This requires a live database. If Docker Desktop is available, run: `docker compose up -d db` (starts just the Postgres container), wait for it healthy (`docker compose ps db`), then from `backend/`: `DATABASE_URL=postgresql+psycopg2://firewatch_user:firewatch_pass@localhost:5432/firewatch_qro python seed.py` (adjust the port/env-setting syntax for your shell — Git Bash on Windows accepts the `VAR=val command` form). Expected output ends with `Base de datos creada y sembrada con datos de ejemplo ✅`. If a live DB isn't reachable in your environment, skip this step and rely on Step 6's full-stack rebuild instead — note in your report which path you took.

- [ ] **Step 5: Run the backend pytest suite to confirm no regression**

Run (from `backend/`): `python -m pytest tests/ -v`
Expected: 16/16 passing (this suite doesn't call `seed.py` at all, so it should be unaffected — this step is a regression check on the rest of the app, not a test of the fix itself).

- [ ] **Step 6: Full clean rebuild to confirm the actual bug is fixed**

```bash
docker compose down -v
docker compose up -d --build
```

Wait roughly 30-40 seconds for healthchecks, then:

Run: `docker compose ps`
Expected: `db` healthy, `db-init` **Exited (0)** (this is the line that was failing before — confirm it now exits clean, not 1), `api1`/`api2`/`api3` show `Up`.

Run: `docker compose logs db-init | tail -20`
Expected: ends with `[init_db] Inicialización completada ✅`, no `DuplicateTimeseries` traceback.

Run: `curl -s http://localhost:8080/api/health`
Expected: `{"status":"ok","servicio":"FireWatch QRO API"}`

Run: `curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@firewatchqro.mx","password":"admin123"}'`
Expected: JSON containing `"access_token"` — confirms the seeded admin user actually exists this time (Task 6 found seeding never completed before).

- [ ] **Step 7: Tear down**

```bash
docker compose down
```

- [ ] **Step 8: Commit**

```bash
git add backend/seed.py
git commit -m "fix: seed.py no longer creates a duplicate Flask app, fixes db-init Prometheus DuplicateTimeseries crash on first boot"
```

---

## Self-Review Notes

- **Spec coverage:** all 5 spec sections (JWT, secrets, validation, ports, Postgres) map 1:1 to Tasks 1-5; Task 6 covers the spec's "Testing / verification plan" section. The dropped firewall-automation item has no task, matching the spec's explicit "Out of scope." Task 7 was added after Task 6's live run surfaced a pre-existing db-init crash blocking verification — not in the original spec, added as a necessary fix to actually satisfy the spec's "Web, API y BD funcionando" testing goal.
- **Type/name consistency:** `roles_required` (Task 1) is the only new function signature introduced and reused nowhere else — no drift risk. `conftest.py` fixtures `app`/`client` and helper `make_user`/`login` (Task 1) are consumed as-is by Task 2's tests, same names, same signatures.
- **No placeholders:** every step has literal code or literal shell commands with expected output, no "add appropriate X" phrasing.
