@echo off
docker exec firewatch_db mysql -uroot -prootpassword -e "DROP USER IF EXISTS 'exporter'@''; DROP USER IF EXISTS 'exporter'@'%%'; CREATE USER 'exporter'@'%%' IDENTIFIED BY 'exporter_pass'; GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%%'; FLUSH PRIVILEGES; SELECT user, host FROM mysql.user;" > fix_exporter.txt 2>&1
echo LISTO

