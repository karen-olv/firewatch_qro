@echo off
echo === UP STACK === > up_only.txt 2>&1
docker compose up -d --remove-orphans >> up_only.txt 2>&1
echo UP_EXIT_%ERRORLEVEL% >> up_only.txt 2>&1
echo. >> up_only.txt 2>&1
echo === ESPERANDO 15s === >> up_only.txt 2>&1
timeout /t 15 /nobreak >nul 2>&1
echo. >> up_only.txt 2>&1
echo === ESTADO CONTENEDORES === >> up_only.txt 2>&1
docker ps --format "{{.Names}} | {{.Status}} | {{.Ports}}" >> up_only.txt 2>&1
echo DONE

