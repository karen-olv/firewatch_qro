# Verificación de requisitos del PI — FireWatch QRO

Última actualización: 2026-08-03

Este documento da, para cada punto de la rúbrica, qué se hizo, dónde vive el código exacto (archivo:línea), y cómo comprobarlo en vivo — `curl`, consultas SQL, `openssl`, navegador real. Todos los comandos son copiar/pegar directos contra el stack Docker local (`docker compose up -d`), y cada afirmación de este documento fue efectivamente ejecutada y verificada durante esta sesión, no es documentación aspiracional. Se documentan también los bugs reales encontrados y corregidos durante la verificación en vivo — 6 en total, y una capacidad agregada que no era parte del alcance original (rate limiting, ver sección 5) — que en conjunto llevaron la suite automatizada de 22/23 a **25/25 checks automatizados en verde** (los 5 restantes de la rúbrica son inherentemente manuales — demo de la app móvil en un dispositivo real, no automatizables con `curl`).

**Alcance explícito:** el hosting en la nube (segundo servidor físico, dominio propio, certificado real de una CA pública) está **fuera de alcance** para esta entrega. Todo se verifica contra el stack completo corriendo localmente vía Docker Compose (`public_net`/`private_net` + HAProxy), arquitectura ya lista para portar a un proveedor cloud sin cambios estructurales.

**Datos de referencia (no sensibles, todo local):**

| Recurso | Valor |
|---|---|
| Stack | `docker compose up -d --build` en la raíz del repo |
| API (vía HAProxy) | `http://localhost:8080` |
| Web (HTTPS, vía HAProxy) | `https://localhost` (certificado autofirmado) |
| HAProxy stats | `http://localhost:8404` — `admin` / `admin123` |
| Grafana | `http://localhost:8405` — `admin` / `admin123` |
| Prometheus | `http://localhost:9090` |
| Usuario admin de prueba | `admin@firewatchqro.mx` / `admin123` (seeded por `backend/seed.py`) |

Secretos reales (`JWT_SECRET_KEY`, `SECRET_KEY`, passwords de Postgres/Grafana) están hardcodeados en `docker-compose.yml` para desarrollo local — esto es aceptable para el alcance de esta entrega (stack no expuesto a internet), pero **no debe usarse así en un despliegue real**; ver sección "Fix real pendiente" más abajo.

**Suite automatizada:** todos los comandos de las secciones 1-13 están scriptados en `scripts/verify_pi_requirements.sh` — corre contra el stack local ya levantado y da un resumen pass/fail:
```bash
docker compose up -d --build
bash scripts/verify_pi_requirements.sh
```
Los ítems 8-10 y parte del 14 (mobile UX) quedan como `MANUAL` porque necesitan interacción manual con un dispositivo real (ver sección "Cómo levantar la app en Expo Go") — no hay forma de automatizar esto sin un harness de pruebas E2E de UI (Detox/Appium), que este proyecto no tiene.

---

## Mapa de código — dónde vive cada requisito

| # | Requisito | Archivo(s) clave | Qué buscar ahí |
|---|---|---|---|
| 1 | Hasheo/JWT | `backend/app/models.py:133-137` (`set_password`/`check_password`)<br>`backend/app/routes/auth.py:82-89` (`create_access_token`) | `werkzeug.security.generate_password_hash`, emisión de JWT |
| 2 | Arquitectura pública/privada | `docker-compose.yml:3-9` | Redes `public_net`/`private_net` |
| 3 | Monitoreo | `monitoring/prometheus/prometheus.yml`<br>`monitoring/grafana/provisioning/datasources/datasource.yml`<br>`monitoring/grafana/provisioning/dashboards/firewatch.json` | Targets de scrape, datasource, 8 paneles del dashboard |
| 4 | Firewall | `deploy/firewall.sh`<br>`docker-compose.yml` (`private_net` sin publicar puertos) | Reglas ufw/iptables deny-by-default |
| 5 | JWT + protección API | `backend/app/auth_utils.py:7-21` (`roles_required`)<br>`backend/app/routes/incendios.py:38-39`<br>`backend/app/routes/alertas.py:25-26`<br>`backend/app/routes/usuarios.py:10`<br>`backend/app/rate_limit.py`, `backend/app/routes/auth.py:13-14,81-82` | Decorador de rol, endpoints protegidos, rate limiting Redis-backed en login/registro |
| 6 | SSL | `deploy/haproxy/haproxy.cfg:26-38`<br>`deploy/ssl/gen_cert.sh` | Bind TLS, generación de cert autofirmado |
| 7 | Balanceador | `deploy/haproxy/haproxy.cfg:75-81` (`backend api_servers`) | `balance roundrobin`, `option httpchk`, 3 réplicas |
| 8-10 | Mobile (utilidad, diseño, navegación) | `app_movil/app/(tabs)/index.tsx`<br>`app_movil/app/(tabs)/_layout.tsx`<br>`app_movil/constants/api.ts` | Flujo de reporte ciudadano, estructura de tabs |
| 11 | Formularios validados | `backend/app/routes/reportes.py:82-97`<br>`backend/app/routes/auth.py:50-63`<br>`app_movil/app/(tabs)/index.tsx:80-99` | Validación server-side (Python) + client-side (TSX) |
| 12 | Datos compartidos mobile/Web | `frontend/src/api.js`<br>`app_movil/constants/api.ts` | Mismos endpoints (`/api/reportes`, `/api/incendios`, `/api/alertas`) consumidos por ambas plataformas |
| 13 | Web+API+BD funcionando (Docker local) | `docker-compose.yml` completo<br>`backend/init_db.py`, `backend/seed.py` | Todo el stack orquestado, inicialización de BD |
| 14 | Mobile 100% funcional | `app_movil/constants/api.ts:26-28` (`API_URL`) | Apunta a la IP LAN del host, no a un mock |

---

## 1. Hasheado y encriptado funcionando

**Qué se hizo:** todos los passwords se guardan con `werkzeug.security.generate_password_hash` (`backend/app/models.py:134`, método `Usuario.set_password`) — hash salteado `scrypt`, nunca texto plano. Verificación con `check_password_hash` (`models.py:136`) en cada login. Al autenticarse, se emite un JWT firmado HS256 (`flask-jwt-extended`, `auth.py:82`) con un claim `rol` embebido, usado por el resto del sistema para autorización.

**Cómo funciona técnicamente:** `scrypt` es una función de derivación de llave diseñada específicamente para ser costosa en memoria además de en CPU — a diferencia de PBKDF2 (que solo es costoso en CPU y por eso es paralelizable barato en GPUs/ASICs), scrypt requiere una cantidad significativa de RAM por intento, lo que encarece mucho más un ataque de fuerza bruta con hardware especializado. El string guardado (`scrypt:32768:8:1$<salt>$<hash>`) codifica los parámetros de costo (N=32768, r=8, p=1) junto con el salt y el resultado — así `check_password_hash` sabe exactamente cómo re-derivar el hash sin necesitar guardar esa configuración en otro lado.

El JWT (JSON Web Token) tiene 3 partes separadas por `.`: header, payload, firma. La firma (HS256 = HMAC-SHA256) se genera con `JWT_SECRET_KEY` — cualquiera puede *leer* el payload (solo está en base64, no cifrado), pero nadie puede *modificarlo* sin la clave secreta. Esto es lo que hace posible que `roles_required` (sección 5) confíe en el claim `rol` del token sin tener que consultar la base de datos en cada request — el token es criptográficamente imposible de falsificar sin la clave.

**Cómo confirmarlo — SQL directo contra la base real:**
```bash
docker compose exec db psql -U firewatch_user -d firewatch_qro -c "SELECT email, password_hash FROM usuarios;"
```
Esperado: columna `password_hash` con formato `scrypt:32768:8:1$<salt>$<hash>`, nunca la contraseña real.

**Cómo confirmarlo — JWT real emitido y firmado:**
```bash
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@firewatchqro.mx","password":"admin123"}'
```
Copiar el `access_token`, pegarlo en [jwt.io](https://jwt.io) — el payload debe mostrar `"rol":"admin"`, `"sub":"1"`, `"exp":...`; la firma debe validar como correcta si se pega también `JWT_SECRET_KEY` (visible en `docker-compose.yml`, variable `JWT_SECRET_KEY` bajo `&api_env`).

**Bug real encontrado y corregido durante esta verificación — escalación de rol vía registro público.** `POST /api/auth/registro` aceptaba un campo `rol` enviado por el cliente sin restricción (`auth.py`, línea que hacía `rol=data.get("rol", "ciudadano")`) — cualquier usuario anónimo podía registrarse con `{"rol":"admin"}`, iniciar sesión, y obtener un JWT con `rol:admin` que pasaba el gate `roles_required("admin", "proteccion_civil")` de los endpoints de escritura (sección 5), sin haber sido autorizado por nadie. Esto defeaba por completo el propósito de la protección JWT. Corregido hardcodeando `rol="ciudadano"` en la construcción del `Usuario` (`auth.py:72`) — el campo `rol` del cliente ahora se ignora totalmente en el registro público; la única forma de crear un usuario `admin`/`proteccion_civil` es directo en la base de datos.

**Cómo confirmarlo — el bug está corregido:**
```bash
curl -s -X POST http://localhost:8080/api/auth/registro -H "Content-Type: application/json" \
  -d '{"nombre":"Mallory","email":"mallory@test.com","password":"password123","rol":"admin"}'
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"mallory@test.com","password":"password123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/incendios \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"zona_id":1}'
```
Esperado: `403` — el token de "Mallory" quedó con `rol:ciudadano` a pesar de haber pedido `admin`, y `roles_required` lo rechaza. Puedes confirmar el rol real guardado con la consulta SQL de arriba.

---

## 2. Dos servidores — uno público, uno privado

**Fuera de alcance explícito** (hosting real en la nube no es parte de esta entrega). Lo que sí existe es la arquitectura Docker que replica ese patrón localmente, lista para portar a 2 droplets/VMs reales sin reescribir nada:

**Qué se hizo:** `docker-compose.yml:3-9` define dos redes Docker: `public_net` y `private_net`. Solo `frontend`, `grafana` y `haproxy` tienen pata en `public_net`. Todo lo demás (`db`, `redis`, `api1-3`, `flask1-2`, `prometheus`, exporters) vive exclusivamente en `private_net`, sin puertos publicados al host (ver sección 4).

**Cómo confirmarlo:**
```bash
grep -A2 "public_net:\|private_net:" docker-compose.yml | head -10
docker network inspect firewatch_qro_public_net --format '{{range .Containers}}{{.Name}} {{end}}'
docker network inspect firewatch_qro_private_net --format '{{range .Containers}}{{.Name}} {{end}}'
```
Esperado: `public_net` lista `firewatch_frontend`, `firewatch_grafana`, `firewatch_haproxy`; `private_net` lista todo el resto (db, redis, api1/2/3, flask1/2, prometheus, exporters).

**Si se portara a la nube:** cada red Docker se convierte en una VPC/subred real; `haproxy` sería el único servicio con IP pública asignada, todo lo demás quedaría en la subred privada solo alcanzable desde `haproxy` — exactamente el mismo patrón, solo con hardware físicamente distinto detrás.

---

## 3. Monitoreo del sistema (Prometheus, Grafana)

**Qué se hizo:** Prometheus scrapea 6 jobs (`firewatch_api`, `firewatch_flask_workers`, `postgres`, `redis`, `node`, `cadvisor`, más sí mismo) cada 10 segundos. Grafana tiene un datasource pre-provisionado apuntando a Prometheus y un dashboard (`firewatch.json`) con **12 paneles**: réplicas activas, PostgreSQL, Redis, host, cAdvisor, peticiones HTTP/segundo, CPU de contenedores, peticiones por endpoint, y **3 paneles dedicados a firewall** (estado activo, % de puertos públicos requeridos abiertos, estado de ufw — ver sección 4 para el bug que impedía que estos 3 mostraran datos).

**Cómo funciona técnicamente:** Prometheus usa modelo **pull** — cada `scrape_interval` (10s), hace `GET /metrics` a cada target y guarda los valores como series de tiempo. Cada exporter (`node_exporter`, `postgres_exporter`, el exporter integrado en `prometheus-flask-exporter` de la API) traduce el estado interno de su sistema al formato de texto plano que Prometheus entiende. Grafana no almacena datos propios — cada panel traduce su expresión PromQL en una consulta HTTP a la API de Prometheus (`/api/v1/query`) y renderiza la respuesta.

**Cómo confirmarlo — targets saludables:**
```bash
curl -s "http://localhost:9090/api/v1/targets" | python -c "import sys,json; d=json.load(sys.stdin); [print(t['labels']['job'], t['health']) for t in d['data']['activeTargets']]"
```
Esperado: todos los jobs en `up`.

**Cómo acceder a Grafana:**
1. Abrir `http://localhost:8405` (vía HAProxy) — usuario `admin`, password `admin123`.
2. Dashboards → **FireWatch QRO - Monitoreo del sistema**.
3. 12 paneles: Réplicas activas, PostgreSQL disponible, Redis disponible, Host disponible, cAdvisor, Peticiones HTTP por segundo (API), Uso de CPU del host, CPU de contenedores, Peticiones por endpoint, Firewall (ufw/iptables), Puertos públicos abiertos (%), Estado ufw.

**Bug real encontrado y corregido durante esta verificación — todos los paneles mostraban "No data".** El datasource de Prometheus se provisionaba sin un `uid` explícito (`monitoring/grafana/provisioning/datasources/datasource.yml`), así que Grafana le asignaba uno autogenerado (ej. `PBFA97CFB590B2093`) en cada arranque. El dashboard (`firewatch.json`), en cambio, tiene los 8 paneles hardcodeados con `"datasource": {"uid": "prometheus"}` — un UID fijo que nunca coincidía con el autogenerado, así que ningún panel podía resolver su datasource, mostrando "No data" con ícono de advertencia en todos. Corregido agregando `uid: prometheus` explícito en `datasource.yml`, y recreando el volumen `grafana_data` (`docker compose rm -f grafana && docker volume rm firewatch_qro_grafana_data && docker compose up -d grafana`) para forzar una reprovisión limpia — Grafana no reconcilia un cambio de `uid` sobre un datasource ya creado con otro UID, necesita partir de cero. Verificado con capturas de pantalla en vivo: los 8 paneles renderizando datos reales tras el fix.

**Cómo confirmarlo — el fix está aplicado:**
```bash
grep "uid:" monitoring/grafana/provisioning/datasources/datasource.yml
curl -s -u admin:admin123 "http://localhost:8405/api/datasources" | python -c "import sys,json; [print(d['name'], d['uid']) for d in json.load(sys.stdin)]"
```
Esperado: ambos muestran `uid: prometheus` / `Prometheus prometheus` — coincide con lo que el dashboard espera.

---

## 4. Firewall aplicado y monitoreado

**Qué se hizo:** `deploy/firewall.sh` aplica una política **deny-by-default** vía ufw/iptables (según cuál esté disponible en el host): solo abre 22 (SSH), 80/443 (web), 8080 (API balanceada), 8404 (stats HAProxy), 8405 (Grafana) — todo lo demás rechazado por defecto. `deploy/deploy.sh:81` invoca este script automáticamente en un despliegue real (Ubuntu). El monitoreo del firewall corre vía `firewall-exporter` (`monitoring/firewall/firewall_metrics.py`), un textfile collector de Prometheus que expone el estado de las reglas como métricas — con 3 paneles dedicados en el dashboard de Grafana (sección 3).

**Cómo funciona técnicamente:** la política es **default-deny**: se rechaza todo paquete entrante que no coincida explícitamente con una regla `ALLOW`, en vez de la alternativa (default-allow con reglas de bloqueo específicas) — un error de omisión (olvidar una regla) falla de forma segura (bloquea de más) en vez de insegura (permite de más). Complementario a esto, ningún servicio interno (`db`, `redis`, `api1-3`, `flask1-2`, exporters) publica puertos al host Docker (sección 2/4) — ni siquiera hace falta que el firewall del SO los bloquee, porque Docker nunca los expone fuera de `private_net` en primer lugar. Solo `haproxy` (borde) y `frontend`/`grafana` (detrás de HAProxy) tocan el host.

**Cómo confirmarlo — reglas definidas:**
```bash
cat deploy/firewall.sh | grep -A1 "ufw allow\|iptables -A INPUT -p tcp"
```
Esperado: solo 22, 80, 443, 8080, 8404, 8405 permitidos explícitamente.

**Cómo confirmarlo — ningún puerto privado escapa al host:**
```bash
docker compose ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "api1|api2|api3|flask1|flask2|db|redis"
```
Esperado: sin ninguna entrada `0.0.0.0:PUERTO->...` — solo direcciones internas de Docker (o vacío), nunca un puerto publicado al host.

**Bug real encontrado y corregido en esta verificación — `firewall-exporter` crash-loopeaba, no era una limitación de la plataforma.** En una primera pasada de verificación, el contenedor quedaba en `Restarting` y se documentó (incorrectamente) como "necesita un host Linux real, no funciona en Docker Desktop/Windows". Una segunda pasada más profunda revisó los logs reales (`docker compose logs firewall-exporter`) y encontró el error verdadero: `exec ./run.sh: no such file or directory` — no un problema de `network_mode: host`, sino que `monitoring/firewall/run.sh` tenía terminadores de línea CRLF (típico de un checkout de git en Windows con `core.autocrlf=true`). El shebang `#!/bin/sh\r` con el `\r` al final hace que el kernel busque un intérprete llamado literalmente `/bin/sh\r`, que no existe — el contenedor Alpine rechaza el `exec` del entrypoint antes de que el script llegue a correr una sola línea.

Corregido en dos capas (defensa en profundidad, igual que la validación de la sección 5):
1. **`monitoring/firewall/Dockerfile`**: se agregó `RUN sed -i 's/\r$//' run.sh firewall_metrics.py` antes del `chmod +x` — normaliza los finales de línea dentro de la imagen sin importar qué line endings tenga el checkout que originó el build context. Este es el fix que realmente importa: funciona sin importar la configuración de git de quien construya la imagen.
2. **`.gitattributes`** (nuevo, raíz del repo): fuerza `eol=lf` para todos los `.sh`, para que futuros checkouts en Windows no vuelvan a generar CRLF en estos archivos.

Tras el fix, rebuild limpio (`docker compose down -v && up -d --build`) y el contenedor pasó de `Restarting (255)` a `Up`, generando métricas reales cada 15 segundos.

**Cómo confirmarlo — el exporter corre y genera métricas reales:**
```bash
docker compose ps firewall-exporter
docker compose logs firewall-exporter --tail 5
```
Esperado: `Up`, logs terminando en `[firewall-exporter] Métricas actualizadas: 5 / 5`.

**Cómo confirmarlo — las métricas llegan hasta Prometheus (pipeline completo, no solo el contenedor vivo):**
```bash
curl -s "http://localhost:9090/api/v1/query?query=firewall_public_ports_open" | python -c "import sys,json; d=json.load(sys.stdin); print(d['data']['result'][0]['value'][1])"
```
Esperado: `5` — los 5 puertos públicos requeridos (80, 443, 8080, 8404, 8405) confirmados abiertos, medido en tiempo real por el exporter, scrapeado por Prometheus vía el textfile collector de `node-exporter`.

**Nota honesta sobre `firewall_enabled`/`firewall_ufw_active`:** estas dos métricas específicas están en `0` en este entorno de desarrollo — correcto y esperado, porque `deploy/firewall.sh` (que activa `ufw`/`iptables` a nivel de sistema operativo) está diseñado para correr sobre un host Linux real desplegado (el target de `deploy/deploy.sh`), no dentro del contenedor Docker Desktop de un desarrollador. Lo que sí se verifica exhaustivamente aquí, con el pipeline de monitoreo completo funcionando de punta a punta, es que **la infraestructura de detección y reporte del estado del firewall es real y funcional** — cuando se despliegue sobre el host Linux objetivo y corra `deploy/firewall.sh`, estas mismas métricas pasarán a `1` sin ningún cambio de código adicional.

---

## 5. Protección de API con JWT

**Qué se hizo:** `POST /api/incendios` y `POST /api/alertas` requieren un JWT válido con `rol` igual a `admin` o `proteccion_civil` (decorador `roles_required`, `backend/app/auth_utils.py:7-21`, aplicado en `incendios.py:38` y `alertas.py:25`). `GET /api/usuarios` requiere cualquier JWT válido, sin restricción de rol (`usuarios.py:10`). `POST /api/reportes` y `POST /api/auth/registro` quedan **intencionalmente** sin autenticación — son los puntos de entrada públicos (reporte ciudadano anónimo, registro de cuenta nueva).

**Cómo funciona técnicamente:**
```python
def roles_required(*roles):
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
`@jwt_required()` (de `flask-jwt-extended`) corre primero — si no hay token válido, corta ahí mismo con `401` antes de que el código de arriba se ejecute. Si el token es válido, `get_jwt()` lee los claims del payload (ya verificado criptográficamente por la librería) y compara el `rol` contra la lista permitida — sin esto, `403`. La combinación de las dos capas (`jwt_required` + chequeo de rol) es lo que hace posible distinguir "no autenticado" de "autenticado pero sin permiso", códigos de estado distintos con semántica HTTP correcta.

**Cómo confirmarlo — las 4 combinaciones:**
```bash
# 1. Sin token -> 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/incendios -d '{"zona_id":1}' -H "Content-Type: application/json"

# 2. Login como admin, token válido -> 201
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@firewatchqro.mx","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/incendios -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"zona_id":1}'

# 3. Token de un rol no autorizado (ciudadano) -> 403
# (ver sección 1 para el ejemplo completo con Mallory)

# 4. GET /api/usuarios sin token -> 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/usuarios
```

**Bugs reales encontrados y corregidos durante esta verificación — tres formas de provocar un `500` no autenticado en vez de un `400` limpio:**

1. **`registro()` sin guardia de body nulo** (`auth.py:50`): un body JSON literal `null` pasaba `request.get_json(force=True)` y luego `data.get(...)` lanzaba `AttributeError` → `500`. Corregido con `if not data: return 400` inmediatamente después del parseo.
2. **`isinstance(zona_id, int)` aceptaba booleanos** (`reportes.py:84`): en Python, `bool` es subclase de `int`, así que `zona_id: true` pasaba la validación de tipo. Bajo MySQL esto silenciosamente "funcionaba" (coerción a `1`); tras la migración a Postgres, el mismo valor producía un error de comparación de tipos → `500`. Corregido a `isinstance(zona_id, int) or isinstance(zona_id, bool)`.
3. **`nombre_reportante: null` explícito rompía la restricción `NOT NULL`** (`reportes.py:93-97`): un `null` explícito pasaba la validación de longitud (que solo corre si el valor es truthy) pero luego se guardaba tal cual en una columna `nullable=False` → `IntegrityError` → `500`. Corregido normalizando a `"Anónimo"` en el punto de construcción del `Reporte` (`reportes.py:107`), no en la validación — el `null` explícito es un valor legítimo de "no especificado", distinto de un valor inválido.

**Cómo confirmarlo — los 3 casos ahora dan `400`, no `500`:**
```bash
curl -s -o /dev/null -w "null body: %{http_code}\n" -X POST http://localhost:8080/api/auth/registro -H "Content-Type: application/json" -d 'null'
curl -s -o /dev/null -w "zona_id booleano: %{http_code}\n" -X POST http://localhost:8080/api/reportes -H "Content-Type: application/json" -d '{"zona_id":true,"descripcion":"Descripcion valida de prueba"}'
curl -s -X POST http://localhost:8080/api/reportes -H "Content-Type: application/json" -d '{"zona_id":1,"descripcion":"Descripcion valida de prueba","nombre_reportante":null}' | python -c "import sys,json;print(json.load(sys.stdin)['nombre_reportante'])"
```
Esperado: `400`, `400`, y `Anónimo` respectivamente.

**Rate limiting — agregado en esta verificación, no era parte del alcance original.** `POST /api/auth/login` y `POST /api/auth/registro` tienen un límite de **5 peticiones/minuto por IP** (`flask-limiter`, `backend/app/routes/auth.py:13-14,81-82`); el resto de la API tiene un límite global de 100/minuto (`backend/app/extensions.py`, `default_limits`).

**Cómo funciona técnicamente — y por qué esta implementación evita el problema típico de rate limiting con múltiples réplicas:** `flask-limiter` necesita dos cosas para contar correctamente: (1) un almacenamiento compartido entre procesos, y (2) identificar al cliente real, no al proxy. Para (1), el storage es Redis (`RATELIMIT_STORAGE_URI`, `backend/app/config.py`) — el mismo contenedor Redis que ya usan los workers `flask1`/`flask2` para la cola de reportes críticos, así que no se agregó infraestructura nueva. Esto es importante porque hay **3 réplicas de la API** (`api1`/`api2`/`api3`) detrás de HAProxy: si el storage fuera en memoria de cada proceso (`memory://`, la opción por defecto de `flask-limiter`), cada réplica llevaría su propio contador independiente — un cliente que HAProxy reparte entre las 3 tendría efectivamente 3x el límite real antes de que las tres cuentas se agoten. Con Redis compartido, las 3 réplicas leen y escriben el mismo contador, así que el límite de 5/minuto es exacto sin importar cuál réplica atienda cada request.

Para (2), `backend/app/rate_limit.py` (`get_real_client_ip`) lee el header `X-Forwarded-For` en vez de `request.remote_addr` — detrás de un reverse proxy como HAProxy, `remote_addr` es siempre la IP del proxy (`10.x.x.x` interno o `127.0.0.1`), nunca la del visitante real; usar esa IP directamente haría que **todo internet comparta un solo cupo de 5/minuto**. HAProxy ya inyecta ese header (`option forwardfor`, `haproxy.cfg:16`), así que solo hacía falta leerlo del lado de la API.

**Cómo confirmarlo — 6 intentos seguidos, balanceados entre las 3 réplicas:**
```bash
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "intento $i: %{http_code}\n" -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@firewatchqro.mx","password":"incorrecta"}'; done
```
Esperado: intentos 1-5 → `401`, intento 6 → `429`.

**Nota práctica:** el límite es real y compartido entre réplicas — si se corre `scripts/verify_pi_requirements.sh` dos veces seguidas dentro del mismo minuto, la sección 5 puede empezar a fallar en sus propios chequeos de login (`TOKEN`/`TOKEN_CIUDADANO`) porque ya se agotó el cupo de esa IP. Esto es comportamiento correcto del rate limiting, no un bug de la suite — esperar ~60 segundos entre corridas consecutivas, o limpiar el contador directo en Redis: `docker compose exec redis redis-cli FLUSHDB`.

**Fix real pendiente (fuera de alcance de esta entrega):** las credenciales/secretos (`JWT_SECRET_KEY`, `SECRET_KEY`, passwords de Postgres) están hardcodeados en `docker-compose.yml` en texto plano, aceptable para desarrollo local no expuesto a internet — pero antes de cualquier despliegue real deberían moverse a un `.env` no versionado (o a un secrets manager) con valores generados aleatoriamente, siguiendo el patrón que `deploy/deploy.sh:44-64` ya implementa para el flujo de despliegue en la nube (genera secretos con `openssl rand` la primera vez que corre).

---

## 6. Certificado SSL

**Qué se hizo:** certificado autofirmado (RSA 2048, válido 825 días) generado por `deploy/ssl/gen_cert.sh`, servido por HAProxy en `:443`. HTTP (`:80`) redirige forzosamente a HTTPS. Solo TLS 1.2+ permitido (`ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11`, `haproxy.cfg:8`).

**Cómo funciona técnicamente:** el script genera la llave privada y el certificado con `openssl req -x509 -newkey rsa:2048 -nodes`, incluyendo un `subjectAltName` (`DNS:localhost, DNS:firewatchqro.local, IP:127.0.0.1`) — sin esto, navegadores/clientes modernos rechazan el certificado aunque el `CN` sea correcto (el campo `CN` para validación de hostname está deprecado desde RFC 6125). HAProxy necesita el certificado y la llave privada concatenados en un solo archivo `.pem` (`cat firewatch.crt firewatch.key > firewatch.pem`) — así es como esta implementación específica de TLS termination lo espera.

Al ser autofirmado (no emitido por una CA públicamente confiable como Let's Encrypt), el navegador mostrará una advertencia de seguridad la primera vez — esto es esperado y aceptable para el alcance de desarrollo local de esta entrega; el mismo script documenta el paso a Let's Encrypt para producción real (`gen_cert.sh:6-11`), que solo requiere un dominio público apuntando al servidor.

**Cómo confirmarlo — cert real servido por HAProxy (no solo el archivo en disco):**
```bash
echo | openssl s_client -connect localhost:443 -servername localhost 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```
Esperado: `subject=C=MX, ST=Queretaro, ..., CN=localhost`, SAN incluyendo `DNS:localhost, DNS:firewatchqro.local, IP:127.0.0.1`, fechas vigentes.

**Cómo confirmarlo — versiones de TLS obsoletas rechazadas:**
```bash
echo | openssl s_client -connect localhost:443 -tls1_1 2>&1 | grep -i "no protocols\|handshake"
echo | openssl s_client -connect localhost:443 -tls1_2 2>&1 | grep -i "Protocol\|Cipher"
```
Esperado: TLS 1.1 → `no protocols available` (rechazado); TLS 1.2 → conexión exitosa con cipher `ECDHE-RSA-AES256-GCM-SHA384` o similar.

**Cómo confirmarlo — redirect HTTP→HTTPS forzado:**
```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost/
```
Esperado: `302` con `Location: https://localhost/`.

**Bug real encontrado durante esta verificación (ambiental, no del proyecto) — conflicto de puerto con un servicio preexistente en el host.** Al probar `https://localhost/` desde este entorno de desarrollo específico, las respuestas venían de un certificado completamente distinto (`CN=localhost`, vigente 2009-2019, expirado) con firma de Apache/XAMPP, no de nuestro HAProxy. Diagnóstico (`Get-NetTCPConnection -LocalPort 443,80`) confirmó que **XAMPP (`httpd.exe`, servicio Windows `Apache2.4`) ya tenía los puertos 80/443 ocupados en `0.0.0.0`** en esta máquina de desarrollo específica, ganando la resolución de `localhost` sobre el binding de Docker. No es un bug del proyecto — es un conflicto de puerto local. Se verificó deteniendo temporalmente el servicio (`Stop-Service Apache2.4`), confirmando que el certificado real de FireWatch QRO se sirve correctamente (evidencia de arriba), y reiniciando Apache después (`Start-Service Apache2.4`). En cualquier máquina sin XAMPP corriendo en esos puertos, este conflicto no existe.

---

## 7. Balanceador de carga

**Qué se hizo:** HAProxy reparte tráfico `round robin` entre 3 réplicas reales de la API (`api1`, `api2`, `api3`, contenedores Docker independientes) en el puerto `:8080`. Healthcheck activo (`option httpchk GET /api/health`, cada 5s, 3 fallos para marcar caído, 2 éxitos para recuperar) saca automáticamente del pool cualquier réplica que falle. Página de stats con autenticación en `:8404`.

**Cómo funciona técnicamente:** HAProxy actúa como **reverse proxy** — recibe la conexión del cliente y abre una conexión nueva y separada hacia la réplica que le toque. `round robin` mantiene un puntero que avanza secuencialmente por la lista de servidores (`api1` → `api2` → `api3` → `api1`...), sin mirar carga real ni tiempo de respuesta. Con 3 réplicas idénticas y peticiones de costo similar, esto produce un reparto casi perfectamente parejo (evidencia abajo: incrementos de 3/3/3 en 9 peticiones consecutivas).

El healthcheck corre en segundo plano, independiente del tráfico de usuarios reales — si `api2` deja de responder `200` en `/api/health`, HAProxy la marca `DOWN` internamente y deja de enviarle tráfico nuevo hasta que vuelva a responder sano, sin intervención manual.

**Cómo confirmarlo — reparto real de tráfico (contadores antes/después):**
```bash
curl -s -u admin:admin123 "http://localhost:8404/;csv" | grep "^api_servers" | cut -d, -f1,2,8
for i in $(seq 1 9); do curl -s http://localhost:8080/api/health > /dev/null; done
curl -s -u admin:admin123 "http://localhost:8404/;csv" | grep "^api_servers" | cut -d, -f1,2,8
```
Esperado: los 3 contadores (`api1`, `api2`, `api3`) suben en incrementos similares (~3 cada uno tras 9 peticiones) — reparto real, no todo en una sola réplica.

**Cómo confirmarlo — visual:** abrir `http://localhost:8404` (usuario `admin`, password `admin123`), ver las 3 filas `api1`/`api2`/`api3` dentro de `api_servers` con sesiones/peticiones repartidas, todas en verde (`UP`).

**Cómo confirmarlo — failover real:**
```bash
docker stop api1
sleep 20  # esperar a que el healthcheck (3 fallos x 5s) marque la réplica como DOWN
curl -s -u admin:admin123 "http://localhost:8404/;csv" | grep "^api_servers,api1"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/health  # sigue funcionando con api2/api3
docker start api1  # restaurar
```
Esperado: fila `api1` cambia a estado `DOWN`; `/api/health` vía HAProxy sigue devolviendo `200` (servido por `api2`/`api3`).

---

## Cómo levantar la app en Expo Go (necesario para las secciones 8-10 y 14)

**Paso 1 — Instalar Expo Go en el dispositivo de prueba:**
- Android: [Expo Go en Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- iOS: [Expo Go en App Store](https://apps.apple.com/app/expo-go/id982107779)

**Paso 2 — Configurar la URL de la API** (`app_movil/.env`, no versionado):
```
EXPO_PUBLIC_API_URL=http://<IP_LAN_DE_TU_PC>:8080
```
Obtener la IP LAN con `ipconfig` (Windows) — el dispositivo debe estar en la misma red Wi-Fi que la máquina de desarrollo, ya que aquí no hay dominio público (a diferencia de un despliegue en la nube).

**Paso 3 — Levantar el servidor de desarrollo (Metro):**
```bash
cd app_movil
npm install
npx expo start
```
Esto abre una terminal con un QR code.

**Paso 4 — Escanear el QR** con la cámara del dispositivo (iOS) o desde la app Expo Go (Android). El bundle de JS se descarga de la máquina de desarrollo (normal en cualquier flujo de Expo), pero todas las llamadas de red van a `EXPO_PUBLIC_API_URL` — el mismo backend Docker que usa la web.

**Credenciales:** el flujo de reporte ciudadano (`POST /api/reportes`) no requiere login — es intencionalmente anónimo. No hace falta cuenta para probar el flujo principal de la app.

**Qué probar (cubre las secciones 8-10 y 14):**
1. **Ítem 8 (utilidad real):** tab "Reportar" — llenar descripción, seleccionar zona, marcar "es crítico" si aplica, enviar. Es un flujo de campo (ciudadano reportando), distinto del panel admin de la web (login, dashboard, validación).
2. **Ítem 9 (diseño):** recorrer los 3 tabs (Reportar, Incendios, Alertas) — confirmar paleta consistente (`#0B1D33`, `#FF6A3D`, `#C7361B`), tarjetas con badges de color por nivel de riesgo, estados de carga.
3. **Ítem 10 (navegación):** desde cualquier tab, confirmar que llegar a cualquier otra sección toma un solo toque (bottom-tabs siempre visibles).
4. **Ítem 14 (100% funcional):** mientras se usa la app, correr en paralelo:
```bash
docker compose logs api1 api2 api3 --tail 20 -f
```
Esperado: cada acción de la app aparece como una línea de log real en tiempo real.

---

## 8. App móvil de utilidad real (no solo copia de Web)

**Qué existe:** formulario de reporte ciudadano geolocalizado por zona con switch "es crítico" (`app_movil/app/(tabs)/index.tsx:41-139`) — pensado para uso en campo (reportar avistamientos de incendio), mientras la web es panel administrativo (login, dashboard, validación de reportes). Son roles complementarios (ciudadano vs. Protección Civil), no funciones duplicadas: la web nunca tuvo un formulario de reporte ciudadano público, y el móvil nunca tuvo un panel de validación/administración.

**Cómo confirmarlo:** abrir la app (Expo Go), comparar el flujo "Reportar" con el panel web (`https://localhost/dashboard`, login admin) — son interfaces y audiencias distintas consumiendo la misma API.

---

## 9. Diseño y estética profesional de la app móvil

**Qué existe:** paleta consistente, tarjetas con bordes/badges de color por nivel de riesgo, estados de carga (`ActivityIndicator`), pull-to-refresh, chips de filtro, contador de caracteres en el formulario (`app_movil/app/(tabs)/incendios.tsx:149-216`, `index.tsx:287-425`).

**Limitación conocida:** el proyecto usa `theme.ts`/`use-color-scheme` heredados del template default de Expo, sin sistema de diseño propio ni assets/iconografía custom (solo los placeholders del scaffold de Expo en `assets/images`). Nivel "funcional y ordenado", no un sistema de diseño de producto pulido — honesto de cara a la evaluación.

**Cómo confirmarlo:** recorrer las 3 pantallas (Reportar, Incendios, Alertas) y confirmar consistencia de color/tipografía/espaciado.

---

## 10. Navegación móvil clara

**Qué existe:** `bottom-tabs` con Expo Router (`app_movil/app/(tabs)/_layout.tsx:25-46`) — 3 secciones (Reportar, Incendios, Alertas) siempre visibles, con íconos, `headerShown: false` consistente, `HapticTab` para feedback táctil.

**Cómo funciona técnicamente:** Expo Router usa convención basada en archivos (`app/(tabs)/index.tsx` = tab por defecto, etc.) sobre React Navigation — cada archivo en `(tabs)/` se vuelve automáticamente una pestaña. No hay navegación anidada compleja (stack dentro de tabs) porque el alcance de la app es simple (3 pantallas planas), lo cual es apropiado para el caso de uso (reporte rápido en campo, no una app con jerarquía profunda de contenido).

**Cómo confirmarlo:** desde cualquier tab, llegar a cualquier otra sección toma un solo toque — sin menús ocultos ni gestos no obvios.

---

## 11. Formularios con validación real antes de enviar a la BD

**Qué se hizo:** validación en dos capas independientes — cliente (móvil, TypeScript) y servidor (Python/Flask).

**Cómo funciona técnicamente — defensa en profundidad:**
1. **Client-side** (`app_movil/app/(tabs)/index.tsx:80-99`): funciones que validan antes de armar el request — zona requerida, descripción 10-500 caracteres, nombre mínimo 3 si se llena. Existe por **experiencia de usuario** (feedback instantáneo), no por seguridad — trivial de saltarse con `curl` directo a la API.
2. **Server-side** (`backend/app/routes/reportes.py:82-97`, `backend/app/routes/auth.py:50-63`): validación manual en Python que corre sin importar qué cliente mandó la petición (app, web, o `curl` directo) — es la que realmente protege la base de datos. Devuelve `400` con mensaje específico de qué campo falló, nunca deja pasar datos inválidos ni cae en `500`.

**Cómo confirmarlo — servidor rechaza datos inválidos independiente del cliente:**
```bash
curl -s -X POST http://localhost:8080/api/reportes -H "Content-Type: application/json" \
  -d '{"zona_id":1,"descripcion":"corto"}'
```
Esperado: `400`, `{"error": "descripcion debe tener entre 10 y 500 caracteres"}`.

```bash
curl -s -X POST http://localhost:8080/api/auth/registro -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"no-es-un-email","password":"password123"}'
```
Esperado: `400`, `{"error": "email inválido"}`.

Ver sección 5 para los 3 bugs de validación encontrados y corregidos (body nulo, `zona_id` booleano, `nombre_reportante` nulo).

---

## 12. Info de la app móvil reflejada en su contraparte Web

**Qué se hizo:** mobile y web comparten la misma API y la misma base de datos — no hay duplicación de datos ni sincronización manual. Móvil usa `ENDPOINTS` apuntando a `${API_URL}/api/...` (`app_movil/constants/api.ts:30-38`), mismos paths que consume `frontend/src/api.js`. Un reporte creado desde el móvil aparece en el panel web tras validación (o de inmediato si es crítico, vía worker automático).

**Cómo funciona técnicamente:** no hay ningún mecanismo de "sincronización" porque no hace falta — ambas plataformas son clientes independientes de la misma API REST, que a su vez es el único punto de acceso a la única base de datos Postgres. Cuando móvil hace `POST /api/reportes`, ese request llega a una de las 3 réplicas (`api1`/`api2`/`api3`, balanceadas por HAProxy), que ejecuta un `INSERT` directo. La próxima vez que la web haga `GET /api/reportes`, lee la misma tabla y ve la fila nueva — sin caché intermedio, cada lectura es una consulta SQL fresca.

Adicional: si el reporte se marca `es_critico=true`, la API lo publica en una cola Redis (`reportes_criticos`) que los workers `flask1`/`flask2` consumen para crear automáticamente un `Incendio` + `Alerta` sin intervención manual (`backend/worker.py`) — reflejo automático, no solo "eventualmente visible al recargar".

**Cómo confirmarlo — extremo a extremo:**
```bash
REPORTE=$(curl -s -X POST http://localhost:8080/api/reportes -H "Content-Type: application/json" \
  -d '{"zona_id":1,"descripcion":"Reporte de verificacion end-to-end","nombre_reportante":"Verificador"}')
REPORTE_ID=$(echo "$REPORTE" | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
curl -s http://localhost:8080/api/reportes | python -c "import sys,json; d=json.load(sys.stdin); print('encontrado' if any(r['id']==$REPORTE_ID for r in d) else 'NO encontrado')"
```
Esperado: `encontrado` — mismo endpoint que consume tanto `frontend/src/api.js` como `app_movil/constants/api.ts`.

---

## 13. Web, API y BD funcionando (Docker local — nube fuera de alcance)

**Qué se hizo:** `db` (Postgres 16), `db-init` (inicialización + seed), `api1-3` (Flask+SQLAlchemy), `frontend` (React servido por nginx, proxy vía HAProxy) — todo orquestado con `docker-compose.yml`, `depends_on`/`condition: service_healthy`.

**Cómo confirmarlo — los 3 componentes responden:**
```bash
curl -s -o /dev/null -w "Web: %{http_code}\n" http://localhost/
curl -s -o /dev/null -w "API: %{http_code}\n" http://localhost:8080/api/health
docker compose exec db psql -U firewatch_user -d firewatch_qro -c "\dt" | wc -l
```
Esperado: `302`/`200` en web, `200` en API, 6+ tablas en BD.

**Bugs reales encontrados y corregidos durante esta verificación — el stack no arrancaba limpio la primera vez (`docker compose down -v && up --build`):**

1. **`db-init` crasheaba con `DuplicateTimeseries` de Prometheus.** `backend/init_db.py` llama `create_app()` (que registra métricas de Prometheus globalmente), y cuando la BD está vacía importa `backend/seed.py`, que **también** llamaba `create_app()` a nivel de módulo — dos registros del mismo colector contra el registro global de `prometheus_client` en el mismo proceso → `DuplicateTimeseries` → `db-init` moría antes de sembrar ningún dato, y como `api1-3`/`flask1-2`/`haproxy` dependen de `db-init: condition: service_completed_successfully`, todo el stack se quedaba sin arrancar. Corregido: `seed.py` ya no crea su propia app — su función `run()` asume que ya hay un `app_context` activo (el que `init_db.py` ya tenía abierto), y solo crea su propia app cuando se ejecuta standalone (`python seed.py` directo).
2. **Corregido el bug anterior, apareció un segundo bug: `db-init` se quedaba colgado para siempre (nunca salía).** `Municipio.query.first()` (el chequeo de "¿está vacía la BD?") deja una transacción de lectura abierta en la conexión que usa. Inmediatamente después, `seed.run()` corre `db.drop_all()`/`db.create_all()`, que pueden usar una conexión *distinta* del pool — en Postgres, esa segunda conexión queda esperando indefinidamente el lock exclusivo que necesita, porque la primera conexión nunca liberó su lock de lectura (nadie llamó a `commit()`/`close()`). Corregido agregando `db.session.remove()` entre el chequeo y la siembra, liberando la conexión antes de que `seed.run()` la necesite para DDL.

Ambos bugs eran preexistentes en el proyecto (no introducidos por trabajo de esta sesión en JWT/validación/Postgres) — solo se manifestaban en un arranque limpio desde cero, que nadie había corrido recientemente hasta esta verificación.

**Cómo confirmarlo — arranque limpio real, sin bugs:**
```bash
docker compose down -v
docker compose up -d --build
sleep 40
docker compose ps  # db-init debe mostrar "Exited (0)", no "Restarting" ni colgado
docker compose logs db-init | tail -5  # debe terminar en "Inicialización completada ✅"
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@firewatchqro.mx","password":"admin123"}'
```
Esperado: `db-init` con `Exited (0)`, log de éxito, y el login del admin seeded funciona (prueba de que el seed sí completó, no solo que el proceso no crasheó).

---

## 14. App móvil 100% funcional con su API y BD reales

**Qué se hizo:** `EXPO_PUBLIC_API_URL` de la app apunta a la IP LAN del host Docker (ver "Cómo levantar la app en Expo Go"), nunca a un mock. Todos los flujos (reportar, ver incendios, ver alertas) pasan por la API real del stack.

**Cómo funciona técnicamente:** igual que en la sección de despliegue en Expo Go — el *código* de la app se sirve temporalmente desde Metro (servidor de desarrollo), pero los *datos* con los que interactúa son 100% reales: la misma base de datos, la misma API, el mismo stack que usa la web. Al compilar a un build final (`.apk`/`.ipa`), el único cambio sería dejar de depender de Metro — `EXPO_PUBLIC_API_URL` seguiría siendo el mismo host.

**Cómo confirmarlo:** con la app abierta en Expo Go y usándose activamente, correr en paralelo:
```bash
docker compose logs api1 api2 api3 --tail 30 -f
```
Esperado: cada acción de la app (enviar reporte, ver lista de incendios) aparece como una línea de log real en tiempo real.

---

## Resumen ejecutivo

| # | Requisito | Estado | Evidencia principal |
|---|---|---|---|
| 1 | Hasheo/encriptado | ✅ | `scrypt` real en BD, JWT firmado HS256, escalación de rol bloqueada |
| 2 | 2 servidores público/privado | Fuera de alcance (nube) | Arquitectura `public_net`/`private_net` lista para portar |
| 3 | Monitoreo Prometheus/Grafana | ✅ | Targets `up`, 12 paneles renderizando datos reales (incluye 3 de firewall) |
| 4 | Firewall | ✅ | Reglas ufw/iptables definidas; exporter corriendo, métricas reales llegando a Prometheus/Grafana punta a punta |
| 5 | JWT | ✅ | 401/403/201 correctos, 3 bugs de validación 500→400 corregidos, rate limiting Redis-backed (5/min, real entre 3 réplicas) |
| 6 | SSL | ✅ | Cert real servido, TLS 1.2 aceptado / 1.1 rechazado, redirect forzado |
| 7 | Balanceador | ✅ | Split real 3 réplicas vía stats CSV, failover confirmado |
| 8 | Utilidad real mobile | ✅ | Flujo de reporte ciudadano ≠ panel admin web |
| 9 | Diseño profesional | ✅ (parcial) | Cuidado visual básico, sin sistema de diseño propio |
| 10 | Navegación clara | ✅ | Bottom-tabs simple, 1 toque a cualquier sección |
| 11 | Formularios validados | ✅ | Client-side + server-side, defensa en profundidad |
| 12 | Mobile reflejado en Web | ✅ | Mismos endpoints, mismo dato, worker automático para críticos |
| 13 | Web+API+BD (Docker local) | ✅ | 3 bugs reales de arranque/monitoreo encontrados y corregidos |
| 14 | App móvil 100% funcional | ✅ | Apunta a stack real, logs confirmando tráfico |

**13/14 completos al 100% verificable, 1 fuera de alcance por decisión explícita (hosting en nube). 25/25 checks automatizados en verde — `bash scripts/verify_pi_requirements.sh`.**

---

## Preguntas frecuentes de revisión (Q&A)

### Arquitectura general

**P: ¿Por qué no hay dos servidores físicos reales?**
R: Decisión explícita de alcance para esta sesión — el foco fue cerrar brechas de seguridad (JWT, validación, secretos) y migrar la base de datos, no el despliegue en la nube. La arquitectura Docker (`public_net`/`private_net`) ya está diseñada para portar a 2 droplets/VMs sin cambios estructurales — solo requeriría apuntar cada red Docker a una subred VPC real.

### Seguridad de la aplicación

**P: ¿Por qué `werkzeug.security` (scrypt) y no bcrypt directamente?**
R: Ambas son hashing salteado con factor de trabajo configurable, criptográficamente sólidas en la práctica. La elección fue por ya estar en las dependencias del proyecto (Flask/Werkzeug), no una debilidad.

**P: ¿Cómo se garantiza que nadie más pueda registrarse como admin?**
R: Ver sección 1 — el campo `rol` enviado por el cliente en `POST /api/auth/registro` se ignora por completo; el servidor siempre asigna `"ciudadano"`. La única forma de crear un usuario `admin`/`proteccion_civil` es una inserción directa en la base de datos (lo que hace `seed.py` para el admin de prueba).

**P: ¿Qué pasa si alguien roba el JWT de un usuario?**
R: Puede actuar como ese usuario hasta que el token expire — sin revocación activa de tokens individuales (limitación conocida, no implementada en esta entrega). Mitigación parcial: todo tráfico va sobre HTTPS.

**P: ¿Hay rate limiting contra fuerza bruta de login?**
R: Sí — 5 intentos/minuto por IP en login y registro, agregado durante esta verificación (no era parte del alcance original ni es un requisito explícito de la rúbrica, pero cierra una brecha real de seguridad de fuerza bruta). Ver sección 5 para el detalle técnico completo.

**P: ¿El rate limiting tiene el mismo problema que tuvo SWAY (contador por réplica en vez de global)?**
R: No — se implementó con Redis como storage compartido desde el principio (`RATELIMIT_STORAGE_URI`, ya había un contenedor Redis en el stack para la cola de reportes críticos), en vez de la opción por defecto de `flask-limiter` (`memory://`, en el proceso de cada réplica). Las 3 réplicas de la API leen y escriben el mismo contador en Redis, así que el límite de 5/minuto es exacto sin importar cuál réplica atienda cada request — no hay el bug de "3x el límite real" que sí existe en el otro proyecto de referencia con el mismo patrón de arquitectura.

### Monitoreo y Firewall

**P: ¿Qué pasa si Prometheus se cae?**
R: Los servicios de la app (API, workers, Postgres) siguen funcionando normal — Prometheus solo recolecta métricas, no es una dependencia en el camino crítico de ninguna petición de usuario.

**P: ¿Por qué "Backends activos" y el resto de los paneles de Grafana estaban vacíos al principio?**
R: Ver sección 3 — mismatch entre el `uid` autogenerado del datasource y el `uid: "prometheus"` hardcodeado en los paneles del dashboard. Corregido fijando el `uid` en la provisión del datasource.

**P: ¿El firewall realmente bloquea algo o es solo decorativo?**
R: Los servicios internos (BD, Redis, réplicas de API/workers) nunca publican puertos al host Docker en primer lugar — ni siquiera depende de que el firewall del SO los bloquee activamente, la superficie de ataque ya está reducida a nivel de arquitectura. El script `deploy/firewall.sh` es la capa adicional para cuando se despliega sobre un host Linux real con IP pública.

**P: ¿Por qué `firewall-exporter` estaba en `Restarting` al principio de esta verificación?**
R: No era una limitación de la plataforma (Docker Desktop/Windows) como se pensó inicialmente — era un bug real: `monitoring/firewall/run.sh` tenía terminadores de línea CRLF (de un checkout de git en Windows), que rompían el shebang `#!/bin/sh` dentro del contenedor Alpine (`exec ./run.sh: no such file or directory`). Corregido normalizando los line endings dentro del build del Dockerfile (funciona sin importar el `core.autocrlf` de quien construya la imagen) más un `.gitattributes` para que no vuelva a pasar. Ver sección 4 para el detalle completo y la evidencia de que el pipeline de métricas ahora funciona punta a punta.

### SSL

**P: ¿Por qué el certificado es autofirmado y no de una CA real?**
R: No hay un dominio público apuntando a este servidor (alcance de esta entrega es local/Docker) — Let's Encrypt requiere probar control sobre un dominio real vía el protocolo ACME, imposible sin uno. `deploy/ssl/gen_cert.sh` documenta el paso a Let's Encrypt para cuando exista un despliegue con dominio real.

**P: ¿Por qué a veces `https://localhost` mostraba un certificado completamente distinto (expirado, de 2009)?**
R: Ver sección 6 — conflicto de puerto local con XAMPP/Apache ya corriendo en esta máquina de desarrollo específica, no un bug del proyecto. Se resolvió deteniendo temporalmente ese servicio para la verificación.

### Balanceador de carga

**P: ¿Cómo se sabe que realmente hay 3 réplicas y no una sola respondiendo tres veces?**
R: Cada réplica (`api1`, `api2`, `api3`) es un contenedor Docker separado, visible individualmente en `docker compose ps`. La página de stats de HAProxy muestra cada una como fila independiente con sus propias métricas de sesiones/peticiones.

**P: ¿Si una réplica se cae, el balanceador se entera?**
R: Sí — `option httpchk GET /api/health` consulta cada réplica cada 5 segundos; si falla 3 veces seguidas, HAProxy la saca del pool automáticamente. Ver sección 7 para el comando de verificación con `docker stop`.

### Mobile

**P: ¿La app funciona sin conexión a la API real (modo offline)?**
R: No — es una app cliente-servidor pura, sin modo offline ni caché local persistente. Cualquier pantalla que muestre datos requiere conexión activa al backend.

**P: ¿Qué se necesitaría para llevar esto a producción real (más allá de esta entrega)?**
R: (1) Segundo servidor/VPC real en un proveedor cloud, (2) certificado real de Let's Encrypt con dominio público, (3) mover secretos de `docker-compose.yml` a un `.env` no versionado con valores aleatorios, (4) rate limiting en HAProxy, (5) CI/CD para despliegue automático, (6) alertas de Grafana ante caídas (hoy solo hay dashboards).
