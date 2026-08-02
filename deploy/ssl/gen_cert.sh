#!/bin/bash
# ============================================================
# Genera un certificado SSL autofirmado para FireWatch QRO.
# HAProxy lo usa como terminator TLS en :443.
#
# Para producción con dominio real, usa Let's Encrypt en su lugar:
#   sudo apt install certbot
#   sudo certbot certonly --standalone -d tu-dominio.com
#   cat /etc/letsencrypt/live/tu-dominio.com/fullchain.pem \
#       /etc/letsencrypt/live/tu-dominio.com/privkey.pem \
#       > deploy/ssl/certs/firewatch.pem
# ============================================================
set -e

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/ssl/certs"
mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/firewatch.pem" ]; then
    echo "El certificado ya existe: $CERT_DIR/firewatch.pem"
    echo "Para regenerarlo, bórralo primero: rm $CERT_DIR/firewatch.pem"
    exit 0
fi

echo "Generando certificado autofirmado en $CERT_DIR/firewatch.pem ..."

# Clave privada + certificado (válido 825 días)
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$CERT_DIR/firewatch.key" \
    -out "$CERT_DIR/firewatch.crt" \
    -days 825 \
    -subj "/C=MX/ST=Queretaro/L=Queretaro/O=FireWatchQRO/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:firewatchqro.local,IP:127.0.0.1"

# HAProxy necesita clave+certificado en un solo archivo .pem
cat "$CERT_DIR/firewatch.crt" "$CERT_DIR/firewatch.key" > "$CERT_DIR/firewatch.pem"
chmod 644 "$CERT_DIR/firewatch.pem"

echo "✅ Certificado generado: $CERT_DIR/firewatch.pem"
echo "Usa https://localhost/ en tu navegador (acepta la advertencia)."

