-- ============================================
-- FireWatch QRO - Script de inicialización MySQL
-- Se ejecuta automáticamente la primera vez que se levanta el contenedor db.
-- ============================================

-- Crear usuario para el mysqld-exporter (monitoreo con Prometheus)
CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED BY 'exporter_pass';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;

