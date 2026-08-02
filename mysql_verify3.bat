@echo off
timeout /t 20 /nobreak >nul
docker logs firewatch_mysqld_exporter --tail 8 > mysql_exp7.txt 2>&1
curl -s http://localhost:9104/metrics > mysql_metrics.txt 2>&1
curl -s http://localhost:9090/api/v1/targets > targets.txt 2>&1
echo LISTO

