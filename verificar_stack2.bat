@echo off
echo === CONTENEDORES STACK === > stack2.txt 2>&1
docker ps --format "{{.Names}} | {{.Status}} | {{.Ports}}" >> stack2.txt 2>&1
echo. >> stack2.txt 2>&1
echo === TEST HTTP 8080 === >> stack2.txt 2>&1
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -UseBasicParsing -TimeoutSec 10; Write-Output ('HTTP ' + $r.StatusCode + ' BODY: ' + $r.Content) } catch { Write-Output ('ERROR: ' + $_.Exception.Message) }" >> stack2.txt 2>&1
echo. >> stack2.txt 2>&1
echo === TEST HTTP 5000 === >> stack2.txt 2>&1
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 10; Write-Output ('HTTP ' + $r.StatusCode + ' BODY: ' + $r.Content) } catch { Write-Output ('ERROR: ' + $_.Exception.Message) }" >> stack2.txt 2>&1

