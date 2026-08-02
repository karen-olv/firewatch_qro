@echo off
docker inspect firewatch_mysqld_exporter --format "CAMINO={{.Path}} ARGS={{json .Args}}" > msyqld_args.txt 2>&1
docker inspect firewatch_mysqld_exporter --format "MOUNTS={{json .Mounts}}" > mounts.txt 2>&1
echo LISTO

