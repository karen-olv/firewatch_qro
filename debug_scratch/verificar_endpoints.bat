@echo off
echo === VERIFICACION DE ENDPOINTS === > verificar_endpoints.txt 2>&1
curl -sk -o /dev/null -w "Frontend HTTPS :443 -> %%{http_code}" https://localhost/ >> verificar_endpoints.txt 2>&1
echo. >> verificar_endpoints.txt 2>&1
curl -sk -o /dev/null -w "HAProxy Stats :8404 -> %%{http_code}" https://localhost:8404/ >> verificar_endpoints.txt 2>&1
echo. >> verificar_endpoints.txt 2>&1
curl -sk -o /dev/null -w "Grafana :8405 -> %%{http_code}" https://localhost:8405/login >> verificar_endpoints.txt 2>&1
echo. >> verificar_endpoints.txt 2>&1
curl -s -o /dev/null -w "API :8080/health -> %%{http_code}" http://localhost:8080/api/health >> verificar_endpoints.txt 2>&1
echo. >> verificar_endpoints.txt 2>&1
curl -s -o /dev/null -w "Swagger :8080/docs -> %%{http_code}" http://localhost:8080/docs >> verificar_endpoints.txt 2>&1
echo. >> verificar_endpoints.txt 2>&1
curl -s -o /dev/null -w "Prometheus :9090 -> %%{http_code}" http://localhost:9090/ >> verificar_endpoints.txt 2>&1
echo. >> verificar_endpoints.txt 2>&1
curl -s -o /dev/null -w "HTTP :80 redirect -> %%{http_code}" http://localhost/ >> verificar_endpoints.txt 2>&1
echo. >> verificar_endpoints.txt 2>&1
echo LISTO

