@echo off
echo === LOGS API1 === > crash_logs.txt 2>&1
docker logs api1 --tail 25 2>&1 >> crash_logs.txt
echo. >> crash_logs.txt 2>&1
echo === LOGS HAPROXY === >> crash_logs.txt 2>&1
docker logs firewatch_haproxy --tail 25 2>&1 >> crash_logs.txt
echo. >> crash_logs.txt 2>&1
echo === LOGS FLASK1 (worker) === >> crash_logs.txt 2>&1
docker logs flask1 --tail 25 2>&1 >> crash_logs.txt
echo. >> crash_logs.txt 2>&1
echo === LOGS MYSQLD-EXPORTER === >> crash_logs.txt 2>&1
docker logs firewatch_mysqld_exporter --tail 25 2>&1 >> crash_logs.txt

