-- ============================================================
-- SCRIPT DE MIGRACIÓN - BASE DE DATOS BILLAR SYSTEM
-- Este script crea todas las tablas y datos de ejemplo
-- Uso: mysql -u usuario -p < migrations.sql
-- ============================================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS billar_system;
USE billar_system;

-- ============================================================
-- TABLA: Mesas
-- ============================================================
CREATE TABLE IF NOT EXISTS mesas (
    id_mesa INT AUTO_INCREMENT PRIMARY KEY,
    numero_mesa INT NOT NULL UNIQUE,
    nombre_mesa VARCHAR(50) DEFAULT NULL,
    tipo_mesa ENUM('pool', 'carambola', 'snooker', 'demo') DEFAULT 'pool',
    precio_hora DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    estado ENUM('disponible', 'ocupada', 'mantenimiento', 'reservada') DEFAULT 'disponible',
    color_hex VARCHAR(7) DEFAULT '#1a1a2e',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: Sesiones
-- ============================================================
CREATE TABLE IF NOT EXISTS sesiones (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,
    id_mesa INT NOT NULL,
    id_cliente INT DEFAULT NULL,
    hora_inicio DATETIME NOT NULL,
    hora_fin DATETIME DEFAULT NULL,
    tiempo_total_minutos INT DEFAULT 0,
    costo_total DECIMAL(10, 2) DEFAULT 0.00,
    estado ENUM('activa', 'pausada', 'finalizada', 'cancelada') DEFAULT 'activa',
    notas TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_mesa) REFERENCES mesas(id_mesa) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: Jugadores
-- ============================================================
CREATE TABLE IF NOT EXISTS jugadores (
    id_jugador INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apodo VARCHAR(50) DEFAULT NULL,
    telefono VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    puntos_totales INT DEFAULT 0,
    partidas_jugadas INT DEFAULT 0,
    partidas_ganadas INT DEFAULT 0,
    nivel ENUM('principiante', 'intermedio', 'avanzado', 'experto') DEFAULT 'principiante',
    observaciones TEXT DEFAULT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultime_partida DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: Partidas
-- ============================================================
CREATE TABLE IF NOT EXISTS partidas (
    id_partida INT AUTO_INCREMENT PRIMARY KEY,
    id_jugador1 INT NOT NULL,
    id_jugador2 INT NOT NULL,
    id_mesa INT NOT NULL,
    modalidad ENUM('pool', '3_bandas', 'carambola', 'libre') DEFAULT 'pool',
    tipo_partida ENUM('clasificado', 'libre') DEFAULT 'clasificado',
    puntos_jugador1 INT DEFAULT 0,
    puntos_jugador2 INT DEFAULT 0,
    bolas_jugador1 INT DEFAULT 0,
    bolas_jugador2 INT DEFAULT 0,
    bola8_perdida1 BOOLEAN DEFAULT FALSE,
    bola8_perdida2 BOOLEAN DEFAULT FALSE,
    puntos_juego INT DEFAULT NULL,
    duracion_minutos INT DEFAULT 0,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME DEFAULT NULL,
    estado ENUM('en_progreso', 'finalizada', 'cancelada') DEFAULT 'en_progreso',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_jugador1) REFERENCES jugadores(id_jugador) ON DELETE CASCADE,
    FOREIGN KEY (id_jugador2) REFERENCES jugadores(id_jugador) ON DELETE CASCADE,
    FOREIGN KEY (id_mesa) REFERENCES mesas(id_mesa) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: Categorías
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    color_hex VARCHAR(7) DEFAULT '#16213e',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: Productos
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    codigo_barras VARCHAR(50) DEFAULT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    precio_compra DECIMAL(10, 2) DEFAULT 0.00,
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    unidad_medida VARCHAR(20) DEFAULT 'und',
    estado ENUM('activo', 'inactivo', 'agotado') DEFAULT 'activo',
    imagen_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: Movimientos de inventario
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    tipo_movimiento ENUM('entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo') NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    motivo VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: Clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    saldo_actual DECIMAL(10, 2) DEFAULT 0.00,
    total_consumido DECIMAL(10, 2) DEFAULT 0.00,
    visitas INT DEFAULT 0,
    observaciones TEXT DEFAULT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: Consumos
-- ============================================================
CREATE TABLE IF NOT EXISTS consumos (
    id_consumo INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    id_sesion INT DEFAULT NULL,
    fecha_consumo DATETIME NOT NULL,
    estado ENUM('pendiente', 'pagado', 'cancelado') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
    FOREIGN KEY (id_sesion) REFERENCES sesiones(id_sesion) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: Pagos
-- ============================================================
CREATE TABLE IF NOT EXISTS pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT DEFAULT NULL,
    id_sesion INT DEFAULT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'cuenta_corriente') DEFAULT 'efectivo',
    referencia VARCHAR(100) DEFAULT NULL,
    notas TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    FOREIGN KEY (id_sesion) REFERENCES sesiones(id_sesion) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: Configuración
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- DATOS DE EJEMPLO
-- ============================================================

-- Categorías
INSERT INTO categorias (nombre, descripcion, color_hex) VALUES
('Bebidas Alcohólicas', 'Cervezas, licores, cocktails', '#e94560'),
('Bebidas No Alcohólicas', 'Gaseosas, jugos, agua', '#0f3460'),
('Snacks', 'Papas, mani, nachos', '#f39c12'),
('Comida Rápida', 'Hamburguesas, pizzas, etc.', '#e74c3c');

-- Productos
INSERT INTO productos (id_categoria, nombre, codigo_barras, precio_venta, precio_compra, stock_actual, stock_minimo, unidad_medida, estado) VALUES
(1, 'Cerveza Nacional', '789123456001', 3000, 1500, 24, 6, 'und', 'activo'),
(1, 'Cerveza Importada', '789123456002', 6000, 3500, 12, 3, 'und', 'activo'),
(1, 'Copa de Whisky', '789123456003', 12000, 5000, 10, 2, 'und', 'activo'),
(2, 'Gaseosa Pequeña', '789123456010', 2000, 1000, 30, 10, 'und', 'activo'),
(2, 'Gaseosa Grande', '789123456011', 3500, 1800, 20, 5, 'und', 'activo'),
(2, 'Agua Mineral', '789123456012', 2500, 1200, 15, 5, 'und', 'activo'),
(3, 'Papas Fritas', '789123456020', 5000, 2500, 20, 5, 'und', 'activo'),
(3, 'Maní', '789123456021', 3000, 1500, 15, 3, 'und', 'activo'),
(3, 'Nachos con queso', '789123456022', 8000, 4000, 10, 3, 'und', 'activo');

-- Mesas
INSERT INTO mesas (numero_mesa, nombre_mesa, tipo_mesa, precio_hora, estado, color_hex) VALUES
(1, 'Mesa 1 - Pool', 'pool', 15000, 'disponible', '#1a1a2e'),
(2, 'Mesa 2 - Pool', 'pool', 15000, 'disponible', '#16213e'),
(3, 'Mesa 3 - Pool', 'pool', 15000, 'disponible', '#0f3460'),
(4, 'Mesa Premium', 'pool', 20000, 'disponible', '#e94560'),
(5, 'Mesa Carambola', 'carambola', 18000, 'mantenimiento', '#533483');

-- Configuración
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('empresa_nombre', 'Billar Express', 'Nombre del negocio'),
('empresa_direccion', 'Calle Principal #123', 'Dirección del negocio'),
('empresa_telefono', '3001234567', 'Teléfono de contacto'),
('moneda', 'COP', 'Moneda del sistema'),
('iva', '19', 'Porcentaje de IVA'),
('mesas_activas', '4', 'Número de mesas activas'),
('password_admin', 'admin123', 'Contraseña de acceso');

-- Jugadores
INSERT INTO jugadores (nombre, apodo, telefono, email, nivel, puntos_totales, partidas_jugadas, partidas_ganadas) VALUES
('Carlos Mendoza', 'El Torito', '3001234567', 'carlos@email.com', 'avanzado', 150, 25, 18),
('Juan Pérez', 'El Mono', '3002345678', 'juan@email.com', 'intermedio', 85, 20, 12),
('Pedro Gómez', 'Petaco', '3003456789', 'pedro@email.com', 'experto', 220, 30, 25),
('María López', 'La China', '3004567890', 'maria@email.com', 'principiante', 30, 10, 5),
('Roberto Díaz', 'El Gato', '3005678901', 'roberto@email.com', 'intermedio', 95, 22, 14),
('Luis Fernández', 'Lucho', '3006789012', 'luis@email.com', 'avanzado', 175, 28, 20),
('Ana Martínez', 'Anita', '3007890123', 'ana@email.com', 'principiante', 45, 12, 7),
('José Rodríguez', 'Checho', '3008901234', 'jose@email.com', 'experto', 250, 35, 28);

-- Clientes
INSERT INTO clientes (nombre, telefono, email, saldo_actual, total_consumido, visitas) VALUES
('Cliente Frecuente 1', '3101111111', 'cliente1@email.com', 25000, 150000, 15),
('Cliente Frecuente 2', '3102222222', 'cliente2@email.com', 0, 85000, 8),
('Cliente Ocasional', '3103333333', 'cliente3@email.com', 15000, 45000, 3),
('Cliente Nuevo', '3104444444', 'cliente4@email.com', 0, 12000, 1),
('Cliente VIP', '3105555555', 'cliente5@email.com', 50000, 350000, 30);

-- Partidas
INSERT INTO partidas (id_jugador1, id_jugador2, id_mesa, modalidad, tipo_partida, puntos_jugador1, puntos_jugador2, bolas_jugador1, bolas_jugador2, bola8_perdida1, bola8_perdida2, puntos_juego, duracion_minutos, fecha_inicio, fecha_fin, estado) VALUES
(1, 2, 1, 'pool', 'clasificado', 0, 0, 5, 3, FALSE, FALSE, NULL, 45, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY + INTERVAL 45 MINUTE, 'finalizada'),
(3, 4, 2, 'pool', 'clasificado', 0, 0, 7, 2, FALSE, FALSE, NULL, 60, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY + INTERVAL 60 MINUTE, 'finalizada'),
(5, 6, 1, '3_bandas', 'clasificado', 45, 38, 0, 0, FALSE, FALSE, 50, 30, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY + INTERVAL 30 MINUTE, 'finalizada'),
(2, 3, 3, 'pool', 'libre', 0, 0, 4, 4, FALSE, FALSE, NULL, 35, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY + INTERVAL 35 MINUTE, 'finalizada'),
(7, 8, 2, '3_bandas', 'clasificado', 50, 47, 0, 0, FALSE, FALSE, 50, 40, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 5 DAY + INTERVAL 40 MINUTE, 'finalizada');

-- ============================================================
-- MENSAJE DE ÉXITO
-- ============================================================
SELECT '✅ Base de datos creada exitosamente!' AS mensaje;
SELECT COUNT(*) AS total_mesas FROM mesas;
SELECT COUNT(*) AS total_jugadores FROM jugadores;
SELECT COUNT(*) AS total_clientes FROM clientes;
SELECT COUNT(*) AS total_productos FROM productos;
SELECT COUNT(*) AS total_partidas FROM partidas;
