# FireWatch QRO 🔥

Sistema de monitoreo y reporte de incendios forestales para el estado de Querétaro. Backend Flask + PostgreSQL, dashboard web en React, app móvil en Expo/React Native, todo orquestado con Docker Compose detrás de un balanceador HAProxy con TLS, monitoreo Prometheus/Grafana, y protección JWT + rate limiting.

**Estado de la rúbrica:** 25/25 checks automatizados en verde. Ver [`docs/PI_REQUIREMENTS_VERIFICATION.md`](docs/PI_REQUIREMENTS_VERIFICATION.md) para evidencia punto por punto (comandos `curl`/SQL/`openssl` copiar-pegar, bugs reales encontrados y corregidos durante la verificación).

---

## Arquitectura

```
                         Internet
                             │
                        ┌────▼────┐
                        │ HAProxy │  :80 → :443 (TLS) · :8080 API · :8404 stats · :8405 Grafana
                        └────┬────┘
              ┌──────────────┼──────────────┐
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ Frontend  │  │ api1/2/3  │  │  Grafana  │
        │  (React)  │  │  (Flask)  │  │           │
        └───────────┘  └─────┬─────┘  └─────┬─────┘
                              │              │
                  ┌───────────┼──────────────┤
            ┌─────▼─────┐ ┌───▼───┐    ┌─────▼─────┐
            │ PostgreSQL│ │ Redis │    │ Prometheus│
            │           │ │       │    │+ exporters│
            └───────────┘ └───┬───┘    └───────────┘
                          ┌────▼────┐
                          │flask1/2 │  workers: reportes críticos → incendio + alerta
                          └─────────┘
```

Red `public_net` (frontend, grafana, haproxy) separada de `private_net` (db, redis, api, workers, monitoreo) — ningún servicio interno publica puertos al host.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Flask 3, SQLAlchemy, Flask-JWT-Extended, Flask-Limiter |
| Base de datos | PostgreSQL 16 |
| Cola de trabajo | Redis (reportes críticos → workers) |
| Frontend web | React + Vite |
| App móvil | Expo / React Native |
| Balanceador | HAProxy (TLS termination + round-robin + stats) |
| Monitoreo | Prometheus + Grafana + node/postgres/redis exporters |
| Orquestación | Docker Compose |

## Arrancar el proyecto

```bash
bash deploy/ssl/gen_cert.sh   # una sola vez: genera el certificado TLS autofirmado
docker compose up -d --build
```

- Web: `https://localhost` (cert autofirmado, el navegador va a advertir la primera vez — aceptar)
- API: `http://localhost:8080`
- HAProxy stats: `http://localhost:8404` (`admin` / `admin123`)
- Grafana: `http://localhost:8405` (`admin` / `admin123`)
- Usuario admin de prueba: `admin@firewatchqro.mx` / `admin123`

Verificar que todo funciona:
```bash
bash scripts/verify_pi_requirements.sh
```

### App móvil

```bash
cd app_movil
echo "EXPO_PUBLIC_API_URL=http://<TU_IP_LOCAL>:8080" > .env   # ipconfig/ifconfig para tu IP
npm install
npx expo start
```
Escanear el QR con Expo Go. El teléfono y la compu deben estar en el mismo WiFi.

## Estructura

```
backend/          API Flask (routes, models, auth, validación)
frontend/         Dashboard web (React)
app_movil/        App Expo/React Native
deploy/           HAProxy, SSL, firewall, script de despliegue en la nube
monitoring/       Prometheus, Grafana, exporters de firewall
db/               Scripts de inicialización de BD
docs/             Especificaciones, planes y verificación de rúbrica
scripts/          Suite de verificación automatizada
```

## Seguridad implementada

- Passwords hasheados con `scrypt` (Werkzeug), nunca texto plano
- JWT con roles (`admin`, `proteccion_civil`, `ciudadano`) — endpoints de escritura protegidos, sin escalación de rol posible desde el registro público
- Rate limiting (5/min login y registro, Redis compartido entre las 3 réplicas de la API — no hay bypass balanceando entre instancias)
- Validación server-side en todos los formularios que escriben a la BD
- TLS 1.2+ forzado, HTTP redirige a HTTPS
- Firewall deny-by-default (`deploy/firewall.sh`) + monitoreo del estado del firewall vía Prometheus
- Secretos fuera de git (`.env`, llaves SSL)

---

## Créditos

Proyecto construido por **Emiliano Ledesma**.

Un agradecimiento especial a Karen, Diego y Abraham por su invaluable aportación a este repositorio — su fe inquebrantable en que "alguien más lo iba a hacer" resultó, contra todo pronóstico, en que ese alguien fuera siempre la misma persona.

Si están leyendo esto en la presentación: de nada.
