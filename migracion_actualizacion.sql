-- ============================================================
-- SCRIPT DE MIGRACIÓN - Actualización de Base de Datos
-- Este script agrega los campos necesarios para el funcionamiento correcto
-- Uso: mysql -u usuario -p < migracion_actualizacion.sql
-- ============================================================

USE billar_system;

-- ============================================================
-- 1. Agregar campo id_cliente a sesiones (si no existe)
-- ============================================================
-- Verificar si la columna existe
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'billar_system' 
    AND TABLE_NAME = 'sesiones' 
    AND COLUMN_NAME = 'id_cliente'
);

-- Si no existe, agregarla
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE sesiones ADD COLUMN id_cliente INT DEFAULT NULL AFTER id_mesa',
    'SELECT ''Columna id_cliente ya existe en sesiones''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar foreign key para id_cliente
ALTER TABLE sesiones 
ADD CONSTRAINT fk_sesiones_cliente 
FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL;

-- ============================================================
-- 2. Agregar campo winner a partidas (si no existe)
-- ============================================================
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'billar_system' 
    AND TABLE_NAME = 'partidas' 
    AND COLUMN_NAME = 'winner'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE partidas ADD COLUMN winner VARCHAR(20) DEFAULT ''empate'' AFTER puntos_juego',
    'SELECT ''Columna winner ya existe en partidas''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 3. Actualizar datos de ejemplo con winner (opcional)
-- ============================================================
-- Actualizar las partidas existentes para tener un winner válido
UPDATE partidas SET winner = 'jugador1' WHERE id_partida = 1;
UPDATE partidas SET winner = 'jugador1' WHERE id_partida = 2;
UPDATE partidas SET winner = 'jugador1' WHERE id_partida = 3;
UPDATE partidas SET winner = 'empate' WHERE id_partida = 4;
UPDATE partidas SET winner = 'jugador1' WHERE id_partida = 5;
UPDATE partidas SET winner = 'jugador2' WHERE id_partida = 6;
UPDATE partidas SET winner = 'jugador2' WHERE id_partida = 7;

SELECT '✅ Migración completada exitosamente!' AS mensaje;
