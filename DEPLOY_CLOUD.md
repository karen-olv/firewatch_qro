# 🌩️ FireWatch QRO - Despliegue en la nube

Guía paso a paso para alojar el proyecto completo (Web, API, BD) en un
servidor de nube pública (Oracle Cloud, AWS, Azure, DigitalOcean, etc.).

---

## 1. Requisitos del servidor

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU     | 2 vCPU | 4 vCPU      |
| RAM     | 4 GB   | 8 GB        |
| Disco   | 20 GB  | 40 GB SSD   |
| SO      | Ubuntu 22.04 / 24.04 LTS | |
| Docker  | 24+    | 26+         |

**Puertos que deben abrirse en el firewall de la nube (Security Group / NSG):**

| Puerto | Servicio   | Protocolo | Descripción                    |
|--------|------------|-----------|--------------------------------|
| 22     | SSH        | TCP       | Acceso remoto al servidor      |
| 80     | HTTP       | TCP       | Redirección a HTTPS            |
| 443    | HTTPS      | TCP       | Frontend Web con SSL           |
| 8080   | API        | TCP       | API balanceada (HAProxy)       |
| 8404   | Stats LB   | TCP       | Panel de estadísticas HAProxy  |
| 8405   | Grafana    | TCP       | Panel de monitoreo Grafana     |

---

## 2. Conexión SSH

```bash
# Desde tu computadora local
ssh usuario@<IP_PUBLICA_DEL_SERVIDOR>
```

---

## 3. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/firewatch_qro.git
cd firewatch_qro
```

---

## 4. Desplegar (automático)

```bash
# Ejecuta todo: Docker, SSL, firewall, .env, build, up
sudo bash deploy/deploy.sh
```

> ⏱️ El proceso toma 5-10 minutos (descarga imágenes, compile frontend).

El script automáticamente:
1. Instala Docker + Docker Compose.
2. Crea `.env` con secretos aleatorios seguros.
3. Genera certificado SSL autofirmado (`firewatch.pem`).
4. Configura `ufw` con solo los puertos públicos del pizarrón.
5. Levanta el stack completo con `docker compose up -d --build`.
6. Verifica que todos los endpoints respondan.

---

## 5. Acceso al sistema

| Servicio       | URL (local)                          | URL (nube)                                        |
|----------------|--------------------------------------|---------------------------------------------------|
| Web            | https://localhost                    | https://<IP_PUBLICA>                              |
| API            | http://localhost:8080/api/health     | http://<IP_PUBLICA>:8080/api/health               |
| Swagger API    | http://localhost:8080/docs           | http://<IP_PUBLICA>:8080/docs                     |
| Stats HAProxy  | http://localhost:8404                | http://<IP_PUBLICA>:8404 (admin/admin123)         |
| Grafana        | http://localhost:8405                | http://<IP_PUBLICA>:8405 (admin/admin123)         |
| Prometheus     | http://localhost:9090                | Solo red privada (usa Grafana)                    |

---

## 6. Configurar la app móvil

Para que la app móvil apunte al servidor en la nube (en vez de tu computadora local):

### Opción A: Variable de entorno (recomendada)

```bash
# En tu máquina local, al lado de app_movil/
cd app_movil
EXPO_PUBLIC_API_URL=http://<IP_PUBLICA>:8080 npx expo start
```

### Opción B: Editar el archivo directamente

Edita `app_movil/constants/api.ts` y cambia la línea:

```typescript
const DEFAULT_API_URL = 'http://<IP_PUBLICA>:8080';
```

### Opción C: Build con EAS (Expo Application Services)

```bash
# Configurar EAS
eas build --platform android --profile production
# La variable EXPO_PUBLIC_API_URL se define en eas.json
```

---

## 7. Verificar monitoreo

### Prometheus Targets (todos deben estar UP)

```
http://<IP_PUBLICA>:9090/targets
```

### Grafana Dashboard

```
http://<IP_PUBLICA>:8405
```

Login: `admin` / `admin123`

El dashboard `FireWatch QRO - Monitoreo del sistema` incluye:

| Panel | Descripción |
|-------|-------------|
| Réplicas API activas | Cuenta cuántas APIs (api1-3) están UP |
| MySQL disponible | 1 si MySQL responde |
| Redis disponible | 1 si Redis responde |
| Host disponible | 1 si node-exporter funciona |
| cAdvisor disponible | 1 si cAdvisor funciona |
| Peticiones HTTP por segundo | Tráfico global de la API |
| Uso de CPU del host | CPU del servidor |
| CPU de contenedores | CPU de los contenedores Docker |
| Peticiones por endpoint | Desglose por endpoint (1m) |
| **Firewall (ufw/iptables)** | 🆕 **1 si el firewall está activo** |
| **Puertos públicos abiertos (%)** | 🆕 **% de puertos requeridos abiertos** |
| **Estado ufw** | 🆕 **1 si ufw está activo** |

---

## 8. Comandos útiles para administración

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api1

# Ver estado de los contenedores
docker compose ps

# Detener todo
docker compose down

# Actualizar y reiniciar (sin perder BD)
git pull
docker compose up -d --build

# Ver métricas del firewall
docker compose exec firewall-exporter cat /var/lib/node_exporter/textfile/firewall_metrics.prom

# Backup de la base de datos
docker compose exec db mysqldump -uroot -prootpassword firewatch_qro > backup_$(date +%Y%m%d).sql
```

---

## 9. Solución de problemas

### ❌ La API responde 502
- Revisa que `api1`, `api2`, `api3` estén corriendo: `docker compose ps`
- Ver logs: `docker compose logs api1`

### ❌ No se ve el panel de firewall en Grafana
- Espera 30s a que el firewall-exporter genere las primeras métricas
- Verifica: `docker compose logs firewall-exporter`
- Revisa que node-exporter tenga el textfile collector: `docker compose logs node-exporter`

### ❌ La app móvil no se conecta
- Asegúrate de que el celular y el servidor estén en la misma red (o el servidor tenga IP pública)
- Verifica el puerto 8080 abierto en el Security Group de la nube
- Prueba desde el celular: `http://<IP_PUBLICA>:8080/api/health`

### ❌ SSL no funciona
- El certificado es autofirmado (no de confianza pública). El navegador mostrará advertencia.
- Para producción, reemplaza `deploy/ssl/certs/firewatch.pem` con uno de Let's Encrypt usando Certbot.
- Luego reinicia HAProxy: `docker compose restart haproxy`

---

## 10. (Opcional) SSL con Let's Encrypt (Certbot)

```bash
# Instalar certbot
sudo apt install -y certbot

# Obtener certificado (requiere dominio apuntando al servidor)
sudo certbot certonly --standalone -d tudominio.com

# Copiar al directorio de HAProxy
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem deploy/ssl/certs/firewatch.pem
sudo cat /etc/letsencrypt/live/tudominio.com/privkey.pem >> deploy/ssl/certs/firewatch.pem

# Renovar automático
sudo certbot renew --deploy-hook "docker compose restart haproxy"
