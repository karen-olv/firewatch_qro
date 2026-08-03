# Salvation: Security Fixes + PostgreSQL Migration

**Branch:** `Salvation` (local-only, no remote push — owner permission pending)
**Date:** 2026-08-02
**Scope:** Local Docker deployment only. Cloud/remote hosting out of scope.

## Background

A rubric audit (Application-Security-Specialist agent) against 13 academic project
requirements found firewatch_qro CUMPLE or CUMPLE PARCIAL on all points, with 5
concrete gaps worth fixing before final delivery. Separately, a DB migration was
requested to move the project off MySQL onto PostgreSQL ahead of eventual cloud
hosting. This spec bundles both into one branch since they touch overlapping files
(`docker-compose.yml`, `requirements.txt`, `backend/app/config.py`).

## Goals

1. Close the JWT authorization gap on write endpoints that currently accept
   unauthenticated writes.
2. Stop tracking leaked secrets in git going forward.
3. Add server-side validation matching the validation already enforced client-side
   in the mobile app.
4. Stop bypassing HAProxy by exposing API/worker ports directly to the host.
5. Migrate the database engine from MySQL 8.0 to PostgreSQL 16, including the
   monitoring exporter and Grafana panel that reference it.

Explicitly dropped from scope: automating `deploy/firewall.sh` — it's already
invoked by `deploy/deploy.sh:81` for real (Ubuntu) deployments; ufw doesn't apply to
local Docker Desktop dev, so there's nothing to fix here.

## Design

### 1. JWT protection on incendios/alertas/usuarios

- `backend/app/routes/incendios.py:36` (`POST /api/incendios`) and
  `backend/app/routes/alertas.py:23` (`POST /api/alertas`) get `@jwt_required()`
  plus a role check restricting to `admin` and `proteccion_civil`.
- `backend/app/routes/usuarios.py:7` (`GET /api/usuarios`) gets `@jwt_required()`,
  no role restriction (any authenticated user may list).
- A small shared role-check helper (e.g. `require_role(*roles)` in a new
  `backend/app/auth_utils.py`, or an inline check using `get_jwt()["rol"]`) is
  reused across both write endpoints — no new dependency, matches existing
  `flask_jwt_extended` usage in `auth.py`.
- **Verified non-breaking:** `backend/worker.py` writes `Incendio`/`Alerta` rows
  directly via SQLAlchemy (`worker.py:52-72`), never over HTTP, so it's unaffected.
  Neither `frontend/src/api.js` nor `app_movil/constants/api.ts` currently issue a
  POST to `/api/incendios` or `/api/alertas` — only GET. So no existing client
  breaks.
- `POST /api/reportes` (anonymous citizen reports) and `POST /api/auth/registro`
  (public signup) intentionally stay unauthenticated — that's the product design,
  not a gap.

### 2. Untrack leaked secrets

- `git rm --cached backend/.env` and any tracked files under
  `deploy/ssl/certs/` (the private key `firewatch.key` and any `.pem`).
- Add `backend/.env` and `deploy/ssl/certs/*.key` (keep `.gitignore`'d, cert dir
  otherwise untouched) to `.gitignore`.
- No secret rotation — current values stay valid for local dev, per explicit user
  decision. Note added in commit message that git history still contains the old
  values and should be scrubbed/rotated before any real deploy.

### 3. Server-side validation

- `backend/app/routes/reportes.py` `crear_reporte()` (line 74 onward): after the
  existing presence check, add:
  - `descripcion`: 10–500 characters (mirrors `app_movil/app/(tabs)/index.tsx:80-99`)
  - `nombre_reportante`: if provided, minimum 3 characters
  - `zona_id`: must be an int (reject non-numeric)
- `backend/app/routes/auth.py` `registro()` (line 46 onward): add
  - `email`: basic format check (regex, no external dependency)
  - `password`: minimum 8 characters
  - `nombre`: minimum 3 characters
- Implemented as plain Python checks returning `400` with an `error` message,
  consistent with the existing style in these files (no marshmallow/pydantic —
  codebase doesn't use either).

### 4. Stop exposing private ports to host

- `docker-compose.yml`: remove the `ports:` block from `api1`, `api2`, `api3`
  (currently `8001:5000`/`8002:5000`/`8003:5000`) and from `flask1`, `flask2`
  (currently `5001:5001`/`5002:5002`). Keep their `expose:` entries unchanged so
  they remain reachable to `haproxy` and to each other on `private_net`.
- All external traffic continues to flow through `haproxy` (`:80`/`:443`/`:8080`),
  which already load-balances across `api1-3`.
- No client code changes — nothing in frontend/app_movil talks to these ports
  directly (they use `HAProxy`'s public port).

### 5. MySQL → PostgreSQL migration

- `backend/requirements.txt`: replace `PyMySQL==1.1.1` with `psycopg2-binary`
  (pinned to a current stable version).
- Connection string `mysql+pymysql://` → `postgresql+psycopg2://` in:
  - `backend/app/config.py:12` (default `SQLALCHEMY_DATABASE_URI`)
  - `docker-compose.yml` `db-init` service env `DATABASE_URL`
  - `docker-compose.yml` `&api_env` anchor (shared by `api1-3`, `flask1-2`)
  - `backend/.env.example`
- `docker-compose.yml` `db` service:
  - `image: mysql:8.0` → `image: postgres:16-alpine`
  - env vars `MYSQL_ROOT_PASSWORD/MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD` →
    `POSTGRES_DB/POSTGRES_USER/POSTGRES_PASSWORD`
  - volume `mysql_data:/var/lib/mysql` → `pg_data:/var/lib/postgresql/data`
    (update the top-level `volumes:` declaration too)
  - healthcheck: `mysqladmin ping` → `pg_isready -U <user>`
  - drop the `./db/init.sql` mount (that script only creates the MySQL
    mysqld-exporter grant, superseded by the exporter swap below)
- Monitoring:
  - `mysqld-exporter` service (`docker-compose.yml:207-224`) → replaced with
    `prometheuscommunity/postgres-exporter`, configured via a `DATA_SOURCE_NAME`
    env var pointing at the `db` service (no `.my.cnf`-style file needed).
  - Delete `monitoring/mysql/.my.cnf`.
  - `monitoring/prometheus/prometheus.yml`: rename the `mysql` scrape job to
    `postgres` (target stays the exporter's container:port).
  - `monitoring/grafana/provisioning/dashboards/firewatch.json:134-139`: panel
    expression `up{job="mysql"}` → `up{job="postgres"}`, title "MySQL disponible"
    → "PostgreSQL disponible".
- Cleanup: delete `Mysql BD/firewatch_qro.sql` (unused seed artifact with a
  hardcoded plaintext password, superseded by `backend/seed.py`) and
  `db/init.sql` (MySQL-specific exporter grant, no longer applicable).
- App code: **no changes**. `backend/app/models.py`, `backend/seed.py`,
  `backend/init_db.py` are pure SQLAlchemy ORM with no MySQL-specific types or raw
  SQL beyond `text("SELECT 1")` (portable as-is). Schema is created via
  `db.create_all()` — no hand-written DDL or Alembic migrations to port.
- Data: no real production data exists — only demo seed data. Migration is
  "recreate fresh", not "copy rows": `docker compose down -v` (drops the old
  `mysql_data` volume, replaced by fresh `pg_data`), then `db-init` runs
  `init_db.py` → `seed.py` against the new Postgres instance, exactly like today.

## Testing / verification plan

- `docker compose up -d --build` from a clean state (`down -v` first) brings up
  Postgres, all 3 API replicas, both workers, monitoring stack, and HAProxy
  healthy.
- `GET /api/health` via HAProxy (`:8080`) returns 200.
- `POST /api/incendios` and `POST /api/alertas` without a token → 401; with an
  `admin`/`proteccion_civil` token → 201; with a `ciudadano` token → 403.
- `GET /api/usuarios` without a token → 401; with any valid token → 200.
- `POST /api/reportes` with a 5-character `descripcion` → 400; with a valid one →
  201 (unchanged happy path).
- `POST /api/auth/registro` with a 4-character password → 400; with a malformed
  email → 400; valid payload → 201 (unchanged happy path).
- `docker compose ps` shows no `8001-8003`/`5001-5002` published host ports;
  `curl localhost:8001` from the host fails to connect.
- Grafana "PostgreSQL disponible" panel shows up (green) once `db` + the new
  exporter are healthy.
- `git status` / `git log -- backend/.env deploy/ssl/certs` confirms the files are
  untracked going forward (history still has them — documented, not fixed here).

## Out of scope

- Cloud/remote hosting, real TLS certs (Let's Encrypt), secret rotation, secret
  rewrite of git history, `deploy/firewall.sh` automation for local dev, and any
  UI/design work on the mobile app (rubric item 9) — not part of this branch.
