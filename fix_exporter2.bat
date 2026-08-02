@echo off
docker exec firewatch_db mysql -uroot -prootpassword -e "ALTER USER 'exporter'@'%%' IDENTIFIED WITH mysql_native_password BY 'exporter_pass'; FLUSH PRIVILEGES; SELECT user, host, plugin FROM mysql.user WHERE user='exporter';" > fix_exporter2.txt 2>&1
echo LISTO

