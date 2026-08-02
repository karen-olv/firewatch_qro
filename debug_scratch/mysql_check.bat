@echo off
docker compose up -d mysqld-exporter > mysql_up.txt 2>&1
timeout /t 45 /nobreak >nul
docker ps -a --format "{{.Names}}|{{.Status}}" > ps_tmp.txt
docker logs firewatch_mysqld_exporter --tail 15 > mysql_exp3.txt 2>&1
curl -s http://localhost:9104/metrics > mysql_metrics.txt 2>&1
curl -s http://localhost:9090/api/v1/targets > targets.txt 2>&1
echo LISTO

