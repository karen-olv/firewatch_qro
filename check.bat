@echo off
timeout /t 60 /nobreak >nul
docker ps -a --format "{{.Names}}|{{.Status}}" > ps_tmp.txt
docker logs firewatch_haproxy --tail 40 > haproxy_log2.txt 2>&1
docker logs firewatch_mysqld_exporter --tail 10 > mysql_exp3.txt 2>&1
echo HECHO

