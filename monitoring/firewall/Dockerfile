# ============================================================
# FireWatch QRO - Firewall Exporter
# Genera métricas del firewall (ufw/iptables + puertos públicos)
# para que node-exporter las exponga a Prometheus (textfile).
#
# Corre en network_mode: host para poder leer /proc/net/* y
# ejecutar iptables/ufw contra el namespace de red del host.
# ============================================================
FROM python:3.11-alpine

RUN apk add --no-cache iptables iproute2

WORKDIR /opt/firewatch
COPY firewall_metrics.py .
COPY run.sh .
RUN chmod +x run.sh firewall_metrics.py

EXPOSE 0
ENTRYPOINT ["./run.sh"]

