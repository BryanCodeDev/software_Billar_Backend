-- ============================================================
-- SISTEMA DE GESTIÓN PARA BILLARES - Base de Datos MySQL
-- ============================================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS billar_system;
USE billar_system;

-- ============================================================
-- TABLA: Mesas (Control de mesas y tiempo)
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
-- TABLA: Sesiones (Control de tiempo de mesas)
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
    FOREIGN KEY (id_mesa) REFERENCES mesas(id_mesa) ON DELETE CASCADE,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: Jugadores (Registro de jugadores frecuentes)
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
-- TABLA: Partidas (Registro de partidos entre jugadores)
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
    winner VARCHAR(20) DEFAULT 'empate',
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
-- TABLA: Categorías de productos (Inventario)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    color_hex VARCHAR(7) DEFAULT '#16213e',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: Productos (Inventario de bebidas y snacks)
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
-- TABLA: Clientes (Cuenta por cliente)
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
-- TABLA: Consumos (Productos consumidos por clientes)
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
-- TABLA: Pagos (Registro de pagos)
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
-- TABLA: Configuración del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- DATOS INICIALES (Seed Data)
-- ============================================================

-- Insertar categorías básicas
INSERT INTO categorias (nombre, descripcion, color_hex) VALUES
('Bebidas Alcohólicas', 'Cervezas, licores, cocktails', '#e94560'),
('Bebidas No Alcohólicas', 'Gaseosas, jugos, agua', '#0f3460'),
('Snacks', 'Papas, mani, nachos', '#f39c12'),
('Comida Rápida', 'Hamburguesas, pizzas, etc.', '#e74c3c');

-- Insertar productos de ejemplo
INSERT INTO productos (id_categoria, nombre, codigo_barras, precio_venta, precio_compra, stock_actual, stock_minimo, unidad_medida) VALUES
(1, 'Cerveza Nacional', '789123456001', 3000, 1500, 24, 6, 'und'),
(1, 'Cerveza Importada', '789123456002', 6000, 3500, 12, 3, 'und'),
(1, 'Copa de Whisky', '789123456003', 12000, 5000, 10, 2, 'und'),
(2, 'Gaseosa Pequeña', '789123456010', 2000, 1000, 30, 10, 'und'),
(2, 'Gaseosa Grande', '789123456011', 3500, 1800, 20, 5, 'und'),
(2, 'Agua Mineral', '789123456012', 2500, 1200, 15, 5, 'und'),
(3, 'Papas Fritas', '789123456020', 5000, 2500, 20, 5, 'und'),
(3, 'Maní', '789123456021', 3000, 1500, 15, 3, 'und'),
(3, 'Nachos con queso', '789123456022', 8000, 4000, 10, 3, 'und');

-- Insertar mesas de ejemplo
INSERT INTO mesas (numero_mesa, nombre_mesa, tipo_mesa, precio_hora, estado, color_hex) VALUES
(1, 'Mesa 1 - Pool', 'pool', 15000, 'disponible', '#1a1a2e'),
(2, 'Mesa 2 - Pool', 'pool', 15000, 'disponible', '#16213e'),
(3, 'Mesa 3 - Pool', 'pool', 15000, 'disponible', '#0f3460'),
(4, 'Mesa Premium', 'pool', 20000, 'disponible', '#e94560'),
(5, 'Mesa Carambola', 'carambola', 18000, 'mantenimiento', '#533483');

-- Insertar configuración inicial
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('empresa_nombre', 'Billar Express', 'Nombre del negocio'),
('empresa_direccion', 'Calle Principal #123', 'Dirección del negocio'),
('empresa_telefono', '3001234567', 'Teléfono de contacto'),
('moneda', 'COP', 'Moneda del sistema'),
('iva', '19', 'Porcentaje de IVA'),
('mesas_activas', '4', 'Número de mesas activas'),
('password_admin', 'admin123', 'Contraseña de acceso (cambiar en producción)');

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Vista: Estado actual de las mesas
CREATE OR REPLACE VIEW v_mesas_estado AS
SELECT 
    m.id_mesa,
    m.numero_mesa,
    m.nombre_mesa,
    m.tipo_mesa,
    m.precio_hora,
    m.estado,
    m.color_hex,
    s.hora_inicio,
    TIMESTAMPDIFF(MINUTE, s.hora_inicio, NOW()) AS minutos_transcurridos,
    ROUND((TIMESTAMPDIFF(MINUTE, s.hora_inicio, NOW()) / 60) * m.precio_hora, 2) AS costo_actual
FROM mesas m
LEFT JOIN sesiones s ON m.id_mesa = s.id_mesa AND s.estado = 'activa';

-- Vista: Productos con stock bajo
CREATE OR REPLACE VIEW v_productos_bajo_stock AS
SELECT 
    p.id_producto,
    p.nombre,
    c.nombre AS categoria,
    p.stock_actual,
    p.stock_minimo,
    p.precio_venta,
    p.estado
FROM productos p
JOIN categorias c ON p.id_categoria = c.id_categoria
WHERE p.stock_actual <= p.stock_minimo AND p.estado = 'activo';

-- Vista: Resumen de clientesTOP
CREATE OR REPLACE VIEW v_clientes_top AS
SELECT 
    c.id_cliente,
    c.nombre,
    c.telefono,
    c.saldo_actual,
    c.total_consumido,
    c.visitas
FROM clientes c
WHERE c.activo = TRUE
ORDER BY c.total_consumido DESC
LIMIT 10;

-- ============================================================
-- PROCEDIMIENTOS ALMACENADOS ÚTILES
-- ============================================================

DELIMITER //

-- Procedimiento: Iniciar sesión de mesa
CREATE PROCEDURE sp_iniciar_sesion(IN p_id_mesa INT)
BEGIN
    -- Verificar que la mesa esté disponible
    IF (SELECT estado FROM mesas WHERE id_mesa = p_id_mesa) != 'disponible' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La mesa no está disponible';
    END IF;
    
    -- Actualizar estado de la mesa
    UPDATE mesas SET estado = 'ocupada' WHERE id_mesa = p_id_mesa;
    
    -- Crear nueva sesión
    INSERT INTO sesiones (id_mesa, hora_inicio, estado) 
    VALUES (p_id_mesa, NOW(), 'activa');
    
    SELECT LAST_INSERT_ID() AS id_sesion, NOW() AS hora_inicio;
END //

-- Procedimiento: Finalizar sesión de mesa
CREATE PROCEDURE sp_finalizar_sesion(IN p_id_sesion INT)
BEGIN
    DECLARE v_id_mesa INT;
    DECLARE v_hora_inicio DATETIME;
    DECLARE v_minutos INT;
    DECLARE v_precio_hora DECIMAL(10, 2);
    DECLARE v_costo DECIMAL(10, 2);
    
    -- Obtener datos de la sesión
    SELECT id_mesa, hora_inicio INTO v_id_mesa, v_hora_inicio 
    FROM sesiones WHERE id_sesion = p_id_sesion;
    
    -- Calcular tiempo y costo
    SET v_minutos = TIMESTAMPDIFF(MINUTE, v_hora_inicio, NOW());
    SET v_precio_hora = (SELECT precio_hora FROM mesas WHERE id_mesa = v_id_mesa);
    SET v_costo = ROUND((v_minutos / 60) * v_precio_hora, 2);
    
    -- Actualizar sesión
    UPDATE sesiones 
    SET hora_fin = NOW(), 
        tiempo_total_minutos = v_minutos, 
        costo_total = v_costo,
        estado = 'finalizada'
    WHERE id_sesion = p_id_sesion;
    
    -- Liberar la mesa
    UPDATE mesas SET estado = 'disponible' WHERE id_mesa = v_id_mesa;
    
    SELECT p_id_sesion AS id_sesion, v_minutos AS minutos, v_costo AS costo_total;
END //

-- Procedimiento: Agregar producto al inventario
CREATE PROCEDURE sp_agregar_inventario(
    IN p_id_producto INT,
    IN p_cantidad INT,
    IN p_motivo VARCHAR(255)
)
BEGIN
    DECLARE v_stock_anterior INT;
    DECLARE v_stock_nuevo INT;
    
    SELECT stock_actual INTO v_stock_anterior FROM productos WHERE id_producto = p_id_producto;
    SET v_stock_nuevo = v_stock_anterior + p_cantidad;
    
    UPDATE productos SET stock_actual = v_stock_nuevo WHERE id_producto = p_id_producto;
    
    INSERT INTO movimientos_inventario 
    (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo)
    VALUES (p_id_producto, 'entrada', p_cantidad, v_stock_anterior, v_stock_nuevo, p_motivo);
    
    SELECT v_stock_nuevo AS stock_nuevo;
END //

-- Procedimiento: Registrar consumo de cliente
CREATE PROCEDURE sp_registrar_consumo(
    IN p_id_cliente INT,
    IN p_id_producto INT,
    IN p_cantidad INT,
    IN p_id_sesion INT
)
BEGIN
    DECLARE v_precio DECIMAL(10, 2);
    DECLARE v_subtotal DECIMAL(10, 2);
    
    SELECT precio_venta INTO v_precio FROM productos WHERE id_producto = p_id_producto;
    SET v_subtotal = v_precio * p_cantidad;
    
    -- Insertar consumo
    INSERT INTO consumos (id_cliente, id_producto, cantidad, precio_unitario, subtotal, id_sesion, fecha_consumo)
    VALUES (p_id_cliente, p_id_producto, p_cantidad, v_precio, v_subtotal, p_id_sesion, NOW());
    
    -- Actualizar saldo del cliente
    UPDATE clientes SET saldo_actual = saldo_actual + v_subtotal WHERE id_cliente = p_id_cliente;
    
    -- Descontar del inventario
    UPDATE productos SET stock_actual = stock_actual - p_cantidad WHERE id_producto = p_id_producto;
    
    SELECT LAST_INSERT_ID() AS id_consumo, v_subtotal AS subtotal;
END //

