@echo off
echo === PRUEBA END-TO-END: REPORTE CRITICO === > prueba_e2e.txt 2>&1
echo.
echo == 1. Obtener zonas (via HAProxy :8080) == >> prueba_e2e.txt 2>&1
curl -s http://localhost:8080/api/zonas >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo == 2. Enviar reporte critico (via HAProxy) == >> prueba_e2e.txt 2>&1
curl -s -X POST http://localhost:8080/api/reportes -H "Content-Type: application/json" -d "{\"nombre_reportante\":\"Prueba E2E\",\"zona_id\":1,\"descripcion\":\"Reporte critico de prueba end-to-end desde app movil.\",\"es_critico\":true}" >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo == 3. Esperar a que worker procese (Redis) == >> prueba_e2e.txt 2>&1
timeout /t 8 /nobreak >nul 2>&1
echo. >> prueba_e2e.txt 2>&1
echo == 4. Verificar incendios activos (via HAProxy) == >> prueba_e2e.txt 2>&1
curl -s "http://localhost:8080/api/incendios?estado=activo" >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo == 5. Verificar alertas (via HAProxy) == >> prueba_e2e.txt 2>&1
curl -s http://localhost:8080/api/alertas >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo == 6. Verificar resumen dashboard web == >> prueba_e2e.txt 2>&1
curl -s http://localhost:8080/api/estadisticas/resumen >> prueba_e2e.txt 2>&1
echo. >> prueba_e2e.txt 2>&1
echo LISTO

