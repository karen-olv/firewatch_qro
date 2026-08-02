@echo off
echo ===================================== > verificar_stack.txt 2>&1
echo  VERIFICACION DE SERVICIOS FIREWATCH  >> verificar_stack.txt 2>&1
echo ===================================== >> verificar_stack.txt 2>&1
echo. >> verificar_stack.txt 2>&1
echo === CONTENEDORES === >> verificar_stack.txt 2>&1
docker ps -a --format "{{.Names}} | {{.Status}}" >> verificar_stack.txt 2>&1
echo. >> verificar_stack.txt 2>&1
echo === PUERTOS PUBLICOS (pizarron) === >> verificar_stack.txt 2>&1
curl -s -o nul -w "HTTP :80  -> %%{http_code} (redirigira a HTTPS)\n" http://localhost:80 >> verificar_stack.txt 2>&1
curl -sk -o nul -w "HTTPS :443  -> %%{http_code} (Frontend Web SSL)\n" https://localhost:443 >> verificar_stack.txt 2>&1
curl -s -o nul -w "API :8080  -> %%{http_code} (HAProxy balanceo)\n" http://localhost:8080/api/health >> verificar_stack.txt 2>&1
curl -s -o nul -w "Stats HAProxy :8404  -> %%{http_code}\n" http://localhost:8404 >> verificar_stack.txt 2>&1
curl -s -o nul -w "Grafana :8405  -> %%{http_code}\n" http://localhost:8405 >> verificar_stack.txt 2>&1
echo. >> verificar_stack.txt 2>&1
echo === API HEALTH vía balanceador === >> verificar_stack.txt 2>&1
curl -s http://localhost:8080/api/health >> verificar_stack.txt 2>&1
echo. >> verificar_stack.txt 2>&1
echo === PUERTOS PRIVADOS === >> verificar_stack.txt 2>&1
curl -s -o nul -w "api1 :8001 - HTTP %%{http_code}\n" http://localhost:8001/api/health >> verificar_stack.txt 2>&1
curl -s -o nul -w "api2 :8002 - HTTP %%{http_code}\n" http://localhost:8002/api/health >> verificar_stack.txt 2>&1
curl -s -o nul -w "api3 :8003 - HTTP %%{http_code}\n" http://localhost:8003/api/health >> verificar_stack.txt 2>&1
curl -s -o nul -w "flask1 :5001 - HTTP %%{http_code}\n" http://localhost:5001/metrics >> verificar_stack.txt 2>&1
curl -s -o nul -w "flask2 :5002 - HTTP %%{http_code}\n" http://localhost:5002/metrics >> verificar_stack.txt 2>&1
curl -s -o nul -w "Prometheus :9090 - HTTP %%{http_code}\n" http://localhost:9090 >> verificar_stack.txt 2>&1
echo. >> verificar_stack.txt 2>&1
echo === TARGETS PROMETHEUS (salud) === >> verificar_stack.txt 2>&1
curl -s http://localhost:9090/api/v1/targets >> verificar_stack.txt 2>&1
echo LISTO

