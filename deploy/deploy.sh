#!/bin/bash
# ============================================================
# FireWatch QRO - Despliegue en servidor de nube (Ubuntu 22.04+)
#
# Uso (como root o con sudo):
#   sudo bash deploy/deploy.sh
#
# Esto:
#   1. Instala Docker + Docker Compose (si no existen)
#   2. Crea el archivo .env con secretos seguros (si no existe)
#   3. Genera certificado SSL autofirmado (o usa el existente)
#   4. Configura el firewall (ufw) SOLO con los puertos públicos del pizarrón
#   5. Levanta toda la infraestructura (red pública + red privada)
#   6. Verifica la salud del stack y muestra las URLs de acceso
# ============================================================
set -e

IP_PUBLICA="$(curl -s -4 ifconfig.me 2>/dev/null || curl -s -4 icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')"
DOMINIO="${DOMINIO:-}"

echo "==========================================================="
echo " FireWatch QRO - Despliegue en la nube"
echo " IP Pública detectada: ${IP_PUBLICA:-NO DETECTADA}"
echo " Dominio: ${DOMINIO:-ninguno (usar IP)}"
echo "==========================================================="

# ---------- 1. Docker ----------
if ! command -v docker >/dev/null 2>&1; then
    echo "==> Instalando Docker ..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker || true
    systemctl start docker || true
else
    echo "==> Docker ya instalado"
fi

# ---------- 2. Docker Compose ----------
if ! docker compose version >/dev/null 2>&1; then
    echo "==> Instalando Docker Compose ..."
    apt-get update -y
    apt-get install -y docker-compose-plugin
fi

# ---------- 3. Archivo .env con secretos ----------
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "==> Creando $ENV_FILE con secretos seguros ..."
    JWT_SECRET="$(openssl rand -hex 32)"
    SECRET_KEY="$(openssl rand -hex 32)"
    MYSQL_PASS="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
    cat > "$ENV_FILE" <<EOF
# FireWatch QRO - Secretos de producción (NO subir a git)
JWT_SECRET_KEY=${JWT_SECRET}
SECRET_KEY=${SECRET_KEY}
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)
MYSQL_PASSWORD=${MYSQL_PASS}
MYSQL_USER=firewatch_user
EXPORTER_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)
EOF
    chmod 600 "$ENV_FILE"
    echo "==> $ENV_FILE creado."
else
    echo "==> $ENV_FILE ya existe, reutilizando secretos."
fi

set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

# ---------- 4. Certificado SSL ----------
if [ ! -f deploy/ssl/certs/firewatch.pem ]; then
    echo "==> Generando certificado SSL autofirmado ..."
    bash deploy/ssl/gen_cert.sh
else
    echo "==> Certificado SSL ya existe"
fi

# ---------- 5. Firewall ----------
echo "==> Aplicando firewall (ufw) ..."
bash deploy/firewall.sh || echo "!! No se pudo aplicar firewall (ejecuta como root)"

# ---------- 6. Levantar infraestructura ----------
echo "==> Levantando toda la infraestructura (docker compose up -d --build) ..."
docker compose up -d --build

echo "==> Esperando a que los servicios estén listos ..."
sleep 15

# ---------- 7. Healthcheck ----------
echo ""
echo "==> Verificando salud del stack:"
check_url() {
    local url="$1" nombre="$2"
    local code
    code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 8 "$url" 2>/dev/null || echo "000")
    if [ "$code" != "000" ] && [ "$code" != "401" ]; then
        echo "   ✅ $nombre -> HTTP $code"
    else
        echo "   ⚠️  $nombre -> HTTP $code (puede requerir auth o estar reiniciando)"
    fi
}
BASE="https://${DOMINIO:-$IP_PUBLICA}"
check_url "http://${DOMINIO:-$IP_PUBLICA}:8080/api/health" "API balanceada (:8080)"
check_url "$BASE/" "Frontend Web (HTTPS :443)"
check_url "$BASE:8404/" "Stats HAProxy (:8404)"
check_url "$BASE:8405/login" "Grafana (:8405)"

echo ""
echo "==========================================================="
echo " FireWatch QRO desplegado correctamente"
echo "==========================================================="
echo " IP/dominio:    ${DOMINIO:-$IP_PUBLICA}"
echo ""
echo " Web (HTTPS):   https://${DOMINIO:-$IP_PUBLICA}/"
echo " API pública:   http://${DOMINIO:-$IP_PUBLICA}:8080/api/health"
echo " Stats HAProxy: http://${DOMINIO:-$IP_PUBLICA}:8404  (admin/admin123)"
echo " Grafana:       http://${DOMINIO:-$IP_PUBLICA}:8405  (admin/admin123)"
echo " Swagger API:   http://${DOMINIO:-$IP_PUBLICA}:8080/docs"
echo ""
echo " Redes Docker:  public_net (Internet -> HAProxy)"
echo "                private_net (MySQL, Redis, API, workers, monitoreo)"
echo " Para ver logs:  docker compose logs -f"
echo "==========================================================="
echo ""
echo " ⚠️  IMPORTANTE: si la app móvil apunta a este servidor, la URL"
echo "    debe configurarse como:  EXPO_PUBLIC_API_URL=http://${DOMINIO:-$IP_PUBLICA}:8080"
echo "    (ver app_movil/README.md)"

