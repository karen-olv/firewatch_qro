@echo off
docker ps -a --format "{{.Names}}|{{.Status}}" > ps_tmp.txt
docker logs firewatch_haproxy --tail 30 > haproxy_log2.txt 2>&1
curl -s http://localhost:8080/api/health > health8080.txt 2>&1
curl -s http://localhost/ > web80.txt 2>&1
echo LISTO

