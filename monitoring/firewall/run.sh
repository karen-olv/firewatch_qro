#!/bin/sh
# FireWatch QRO - Bucle del firewall-exporter
# Ejecuta el generador de métricas cada 15 segundos.
echo "[firewall-exporter] Iniciando bucle de métricas (cada 15s)..."
while true; do
    python3 /opt/firewatch/firewall_metrics.py || echo "[firewall-exporter] Error generando métricas"
    sleep 15
done

