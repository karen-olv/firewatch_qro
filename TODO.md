# TODO - Completar rúbrica FireWatch QRO

## FASE 1: Monitoreo de Firewall en Grafana (punto 4 de la rúbrica)
- [x] Crear script `monitoring/firewall/firewall_metrics.py` que detecte ufw/iptables y genere métricas Prometheus
- [x] Crear servicio sidecar `firewall-exporter` en docker-compose.yml (loop escribiendo al textfile)
- [x] Configurar `node-exporter` con `--collector.textfile.directory` y volumen compartido
- [x] Agregar paneles "Firewall" al dashboard de Grafana (`firewatch.json`)
- [x] **Construir y levantar el firewall-exporter + node-exporter (verificado `firewall_enabled` en Prometheus = 0 en Windows, será 1 en cloud Linux)**

## FASE 2: Despliegue a la nube (punto 13 de la rúbrica)
- [x] Mejorar `deploy/deploy.sh` (crear .env con secretos, levantar stack, healthcheck, URLs)
- [x] Hacer configurable la URL de la API en la app móvil (`EXPO_PUBLIC_API_URL` con fallback)
- [x] Crear guía `DEPLOY_CLOUD.md` paso a paso (Oracle/AWS/Azure/DigitalOcean)

## FASE 3: Verificación final
- [x] **Probar build + up del stack con firewall-exporter (imágenes construidas, stack arriba)**
- [x] **Probar reporte crítico end-to-end (app móvil → Redis → worker → Incendio+Alerta → web) ✅**
- [x] **Corregir bug del worker: `cannot unpack non-iterable NoneType object` (blpop timeout)**
- [x] Verificar round-robin del HAProxy (api1, api2, api3 alternando; 3 nodos UP)
- [x] Verificar panel de firewall (métricas `firewall_*` en Prometheus, paneles en Grafana)
- [x] Actualizar README con estado final y accesos

## Resumen de verificación final (todo ✅)
- Frontend HTTPS :443 → 200
- API balanceada :8080/health → 200
- Swagger :8080/docs → 200
- HTTP :80 → 302 redirect a HTTPS
- Stats HAProxy :8404 → 200 (admin/admin123)
- Prometheus targets → **todos UP** (api1-3, flask1-2, mysql, redis, node, cadvisor, prometheus, firewall)
- Flujo E2E: reporte crítico → Redis queue → worker → Incendio (id 64) + Alerta (id 7) → reflejado en web
- Contenedores: db (healthy), api1-3, flask1-2, haproxy, redis, prometheus, grafana, exporters, frontend

