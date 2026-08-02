@echo off
echo === LOGS FLASK1 === > logs_workers.txt 2>&1
docker logs flask1 --tail 15 2>&1 >> logs_workers.txt
echo. >> logs_workers.txt 2>&1
echo === LOGS FLASK2 === >> logs_workers.txt 2>&1
docker logs flask2 --tail 15 2>&1 >> logs_workers.txt
echo. >> logs_workers.txt 2>&1
echo === LOGS HAPROXY (errores SSL) === >> logs_workers.txt 2>&1
docker logs firewatch_haproxy --tail 20 2>&1 >> logs_workers.txt

