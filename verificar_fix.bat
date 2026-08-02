@echo off
echo === VERIFICACION POST-FIX === > verificar_fix.txt 2>&1
echo [1] Estado contenedores: >> verificar_fix.txt 2>&1
docker ps --filter "name=api" --filter "name=flask" --format "{{.Names}} {{.Status}}" >> verificar_fix.txt 2>&1
echo. >> verificar_fix.txt 2>&1
echo [2] API health via HAProxy: >> verificar_fix.txt 2>&1
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/api/health >> verificar_fix.txt 2>&1
echo. >> verificar_fix.txt 2>&1
echo [3] Raiz / via HAProxy: >> verificar_fix.txt 2>&1
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/ >> verificar_fix.txt 2>&1
echo. >> verificar_fix.txt 2>&1
echo [4] apispec.json (Swagger spec): >> verificar_fix.txt 2>&1
curl -s -o .\apispec3.txt -w "HTTP %{http_code}\n" http://localhost:8080/apispec.json >> verificar_fix.txt 2>&1
echo. >> verificar_fix.txt 2>&1
echo [5] /docs Swagger UI: >> verificar_fix.txt 2>&1
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/docs >> verificar_fix.txt 2>&1
echo. >> verificar_fix.txt 2>&1
echo LISTO

