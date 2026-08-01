DROP DATABASE firewatch_qro;

CREATE DATABASE firewatch_qro CHARACTER SET utf8mb4;

SHOW DATABASES;

USE firewatch_qro;

SHOW TABLES;

USE firewatch;

-- ============================================
-- MUNICIPIOS
-- ============================================
INSERT INTO
    municipios (id, nombre)
VALUES (1, 'Jalpan de Serra'),
    (2, 'Landa de Matamoros'),
    (3, 'Cadereyta de Montes'),
    (4, 'Pinal de Amoles'),
    (5, 'San Joaquín'),
    (6, 'Colón'),
    (7, 'Amealco de Bonfil'),
    (8, 'Ezequiel Montes'),
    (9, 'Querétaro');

-- ============================================
-- ZONAS
-- ============================================
INSERT INTO
    zonas (
        id,
        nombre,
        municipio_id,
        lat,
        lng
    )
VALUES (
        1,
        'Sierra Gorda - Núcleo',
        1,
        21.2167,
        -99.4833
    ),
    (
        2,
        'Landa Norte',
        2,
        21.1667,
        -99.3333
    ),
    (
        3,
        'Cadereyta Centro',
        3,
        20.6975,
        -99.8214
    ),
    (
        4,
        'Pinal Alto',
        4,
        21.1333,
        -99.6167
    ),
    (
        5,
        'San Joaquín Rural',
        5,
        20.9333,
        -99.6167
    ),
    (
        6,
        'Colón Oriente',
        6,
        20.7867,
        -100.0611
    ),
    (
        7,
        'Amealco Sur',
        7,
        20.1833,
        -100.1500
    ),
    (
        8,
        'Peña de Bernal',
        8,
        20.7500,
        -99.9500
    ),
    (
        9,
        'Querétaro Capital',
        9,
        20.5888,
        -100.3899
    );

-- ============================================
-- INCENDIOS (históricos + activos)
-- ============================================
INSERT INTO
    incendios (
        zona_id,
        nivel_riesgo,
        estado,
        descripcion,
        fuente,
        fecha_deteccion
    )
VALUES (
        1,
        'alto',
        'activo',
        'Incendio activo bajo monitoreo.',
        'sensor',
        NOW()
    ),
    (
        8,
        'medio',
        'activo',
        'Incendio activo bajo monitoreo.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    ),
    (
        7,
        'bajo',
        'activo',
        'Incendio activo bajo monitoreo.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ),
    (
        3,
        'medio',
        'contenido',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 10 DAY)
    ),
    (
        2,
        'bajo',
        'controlado',
        'Registro generado para pruebas y estadísticas.',
        'ciudadano',
        DATE_SUB(NOW(), INTERVAL 20 DAY)
    ),
    (
        4,
        'alto',
        'contenido',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 30 DAY)
    ),
    (
        5,
        'medio',
        'controlado',
        'Registro generado para pruebas y estadísticas.',
        'ciudadano',
        DATE_SUB(NOW(), INTERVAL 45 DAY)
    ),
    (
        6,
        'alto',
        'contenido',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 60 DAY)
    ),
    (
        9,
        'bajo',
        'controlado',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 90 DAY)
    ),
    (
        1,
        'medio',
        'contenido',
        'Registro generado para pruebas y estadísticas.',
        'ciudadano',
        DATE_SUB(NOW(), INTERVAL 120 DAY)
    ),
    (
        8,
        'alto',
        'controlado',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 180 DAY)
    ),
    (
        7,
        'medio',
        'contenido',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 240 DAY)
    ),
    (
        2,
        'alto',
        'controlado',
        'Registro generado para pruebas y estadísticas.',
        'ciudadano',
        DATE_SUB(NOW(), INTERVAL 300 DAY)
    ),
    (
        5,
        'bajo',
        'contenido',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 365 DAY)
    ),
    (
        9,
        'medio',
        'controlado',
        'Registro generado para pruebas y estadísticas.',
        'sensor',
        DATE_SUB(NOW(), INTERVAL 500 DAY)
    );

-- ============================================
-- ALERTAS
-- ============================================
INSERT INTO
    alertas (
        incendio_id,
        nivel,
        descripcion,
        enviada_a
    )
VALUES (
        1,
        'alto',
        'Alerta generada automáticamente por el sistema.',
        'Protección Civil Querétaro'
    ),
    (
        2,
        'medio',
        'Alerta generada automáticamente por el sistema.',
        'Protección Civil Querétaro'
    ),
    (
        3,
        'bajo',
        'Alerta generada automáticamente por el sistema.',
        'Protección Civil Querétaro'
    );

-- ============================================
-- REPORTES CIUDADANOS
-- ============================================
INSERT INTO
    reportes (
        nombre_reportante,
        zona_id,
        descripcion,
        es_critico,
        validado,
        fecha
    )
VALUES (
        'María Elena Ruiz',
        1,
        'Reporte de ejemplo para pruebas del dashboard.',
        1,
        1,
        DATE_SUB(NOW(), INTERVAL 2 HOUR)
    ),
    (
        'José Antonio Vega',
        8,
        'Reporte de ejemplo para pruebas del dashboard.',
        0,
        1,
        DATE_SUB(NOW(), INTERVAL 5 HOUR)
    ),
    (
        'Guardia forestal #12',
        7,
        'Reporte de ejemplo para pruebas del dashboard.',
        1,
        0,
        DATE_SUB(NOW(), INTERVAL 12 HOUR)
    ),
    (
        'Sensor térmico Z-06',
        3,
        'Reporte de ejemplo para pruebas del dashboard.',
        0,
        1,
        DATE_SUB(NOW(), INTERVAL 1 DAY)
    );

-- ============================================
-- USUARIO ADMIN
-- ============================================
INSERT INTO
    usuarios (
        nombre,
        email,
        password_hash,
        rol
    )
VALUES (
        'Admin Protección Civil',
        'admin@firewatchqro.mx',
        '$2b$12$EjemploHashCambiarPorElGeneradoConBcrypt',
        'admin'
    );

-- ====================================================================================================================================
-- LO QUE ESTA ABAJO ES DE COMO SE DIO DE ALTA LOS PERMISOS A LOS SITIOS DEL CLIENTE POR CORS Y TENER ACCESO AL BACKEN Y FRONTEND--
-- =====================================================================================================================================

CREATE USER IF NOT EXISTS 'firewatch_user' @'localhost' IDENTIFIED BY '558902';

GRANT ALL PRIVILEGES ON firewatch_qro.* TO 'firewatch_qro' @'localhost';

FLUSH PRIVILEGES;

-- 1. Actualizamos la contraseña del usuario existente
ALTER USER 'firewatch_user' @'localhost' IDENTIFIED BY '558902';

-- 2. Le damos los permisos correctamente a ese usuario
GRANT ALL PRIVILEGES ON firewatch_qro.* TO 'firewatch_user' @'localhost';

-- 3. Refrescamos los privilegios
FLUSH PRIVILEGES;