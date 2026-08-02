@echo off
echo === CONTENIDO /etc/mysql/.my.cnf === > mysql_debug.txt 2>&1
docker exec firewatch_mysqld_exporter cat /etc/mysql/.my.cnf >> mysql_debug.txt 2>&1
echo === PROBAR USUARIO exporter desde exporter container === >> mysql_debug.txt 2>&1
docker exec firewatch_mysqld_exporter sh -c "echo SELECT 1 | mysql -h host.docker.internal -P 3307 -u exporter -pexporter_pass" >> mysql_debug.txt 2>&1
echo === VER USUARIOS EN MYSQL === >> mysql_debug.txt 2>&1
docker exec firewatch_db mysql -uroot -prootpassword -e "SELECT user, host, plugin FROM mysql.user;" >> mysql_debug.txt 2>&1
echo LISTO

