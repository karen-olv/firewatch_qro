@echo off
docker logs firewatch_mysqld_exporter --tail 20 > mysql_exp3.txt 2>&1
docker logs firewatch_prometheus --tail 15 > prom_log.txt 2>&1
curl -s http://localhost:9090/api/v1/targets > targets.txt 2>&1
curl -s http://localhost/ > web80.txt 2>&1
curl -sk https://localhost/ > web443.txt 2>&1
echo LISTO

