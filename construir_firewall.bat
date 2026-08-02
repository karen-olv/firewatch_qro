@echo off
echo Construyendo firewall-exporter ... > construir_firewall.txt 2>&1
docker compose build firewall-exporter >> construir_firewall.txt 2>&1
echo BUILD_DONE_%ERRORLEVEL% >> construir_firewall.txt
echo === RESULTADO === >> construir_firewall.txt
docker images firewatch_firewall_exporter --format "{{.Repository}} {{.Tag}} {{.Size}}" >> construir_firewall.txt 2>&1

