@echo off
docker exec firewatch_db mysql -uroot -prootpassword -e "CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED BY 'exporter_pass'; GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%'; FLUSH PRIVILEGES;" > create_exp.txt 2>&1
echo LISTO

