# ============================================================
# FireWatch QRO - Firewall Exporter
# Genera métricas del firewall (ufw/iptables + puertos públicos)
# para que node-exporter las exponga a Prometheus (textfile).
#
# Corre en network_mode: host para poder leer /proc/net/* y
# ejecutar iptables/ufw contra el namespace de red del host.
# ============================================================
FROM python:3.11-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends iptables iproute2 \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /opt/firewatch
COPY firewall_metrics.py .
COPY run.sh .
# Normaliza CRLF->LF (checkouts en Windows dejan CRLF, rompe el shebang exec)
RUN sed -i 's/\r$//' run.sh firewall_metrics.py && chmod +x run.sh firewall_metrics.py

EXPOSE 0
ENTRYPOINT ["./run.sh"]

