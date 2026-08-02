@echo off
timeout /t 30 /nobreak >nul
docker ps -a --format "{{.Names}}|{{.Status}}" > ps_tmp.txt
docker logs firewatch_mysqld_exporter --tail 8 > mysql_exp5.txt 2>&1
curl -s http://localhost:9104/metrics > mysql_metrics.txt 2>&1
curl -s http://localhost:9090/api/v1/targets > targets.txt 2>&1
echo LISTO

