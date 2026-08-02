#!/bin/bash
# ============================================================
# FireWatch QRO - Firewall (ufw/iptables)
# Aplica la política de seguridad:
#   - SOLO se abren los puertos públicos del pizarrón
#   - Todo lo demás queda bloqueado
#
# Puertos públicos permitidos:
#   22 (SSH), 80 (HTTP), 443 (HTTPS), 8080 (API),
#   8404 (Stats HAProxy), 8405 (Grafana)
#
# Puertos privados NO se exponen (Docker red privada):
#   3306 MySQL, 6379 Redis, 8001-8003 API, 5001-5002 workers,
#   9090 Prometheus, 9100/9104/9121/8080 exporters
# ============================================================
set -e

echo "==> Configurando firewall de FireWatch QRO ..."

# Detectar si ufw está disponible
if command -v ufw >/dev/null 2>&1; then
    echo "==> Usando ufw"
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp  comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw allow 8080/tcp comment 'API balanceada'
    ufw allow 8404/tcp comment 'Stats HAProxy'
    ufw allow 8405/tcp comment 'Grafana'
    ufw --force enable
    ufw status verbose
else
    echo "==> ufw no encontrado, usando iptables"
    # Reset
    iptables -F
    iptables -X
    # Política por defecto: bloquear
    iptables -P INPUT DROP
    iptables -P FORWARD DROP
    iptables -P OUTPUT ACCEPT
    # Loopback
    iptables -A INPUT -i lo -j ACCEPT
    # Conexiones establecidas
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    # Puertos públicos
    for p in 22 80 443 8080 8404 8405; do
        iptables -A INPUT -p tcp --dport $p -j ACCEPT
    done
    iptables-save > /etc/iptables/rules.v4
fi

echo ""
echo "==> Firewall configurado. Puertos permitidos:"
echo "    22, 80, 443, 8080, 8404, 8405"
echo "==> NOTA: En una nube (Azure/AWS/GCP/Oracle) también debes abrir"
echo "    estos puertos en el Security Group / NSG de la VM."

