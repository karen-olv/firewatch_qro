@echo off
echo === CONTENEDORES FIREWALL === > verificar_fw.txt 2>&1
docker ps -a --filter "name=firewall" --format "{{.Names}} | {{.Status}}" >> verificar_fw.txt 2>&1
echo. >> verificar_fw.txt 2>&1
echo === LOGS FIREWALL-EXPORTER === >> verificar_fw.txt 2>&1
docker logs firewatch_firewall_exporter --tail 10 2>&1 >> verificar_fw.txt
echo. >> verificar_fw.txt 2>&1
echo === METRICAS NODE-EXPORTER (firewall) === >> verificar_fw.txt 2>&1
curl -s http://localhost:9100/metrics --max-time 10 | findstr firewall >> verificar_fw.txt 2>&1
echo. >> verificar_fw.txt 2>&1
echo === PROMETHEUS QUERY firewall_enabled === >> verificar_fw.txt 2>&1
curl -s "http://localhost:9090/api/v1/query?query=firewall_enabled" >> verificar_fw.txt 2>&1

