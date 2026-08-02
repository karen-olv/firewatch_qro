@echo off
echo === TODOS LOS CONTENEDORES === > diag.txt 2>&1
docker ps -a --format "{{.Names}} | {{.Status}}" >> diag.txt 2>&1
echo. >> diag.txt 2>&1
echo === IMAGENES === >> diag.txt 2>&1
docker images --format "{{.Repository}} {{.Tag}} {{.Size}}" >> diag.txt 2>&1

