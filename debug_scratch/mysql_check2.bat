@echo off
docker logs firewatch_mysqld_exporter --tail 10 2> mysql_exp7.txt
echo === METRICAS === >> mysql_exp7.txt
curl -s http://localhost:9104/metrics >> mysql_exp7.txt 2>&1
echo === TARGETS === >> mysql_exp7.txt
curl -s http://localhost:9090/api/v1/targets >> mysql_exp7.txt 2>&1
echo LISTO

