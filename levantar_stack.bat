@echo off
echo === LEVANTANDO STACK FIREWATCH === > levantar_stack.txt 2>&1
echo == 1. Construir imagenes == >> levantar_stack.txt 2>&1
docker compose build api1 api2 api3 flask1 flask2 db-init firewall-exporter >> levantar_stack.txt 2>&1
echo BUILD_EXIT_%ERRORLEVEL% >> levantar_stack.txt 2>&1
echo. >> levantar_stack.txt 2>&1
echo == 2. Levantar servicios == >> levantar_stack.txt 2>&1
docker compose up -d --remove-orphans >> levantar_stack.txt 2>&1
echo UP_EXIT_%ERRORLEVEL% >> levantar_stack.txt 2>&1
echo. >> levantar_stack.txt 2>&1
echo == 3. Estado contenedores == >> levantar_stack.txt 2>&1
timeout /t 10 /nobreak >nul 2>&1
docker ps --format "{{.Names}} | {{.Status}} | {{.Ports}}" >> levantar_stack.txt 2>&1
echo DONE

