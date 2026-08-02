@echo off
docker ps -a --format "{{.Names}}|{{.Status}}" > ps_tmp.txt
docker logs firewatch_haproxy --tail 40 > haproxy_log2.txt 2>&1
echo HECHO

