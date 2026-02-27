// Script de migraciones automáticas
// Se ejecuta al iniciar el servidor

import pool from './config/database.js';

const migrations = [
  // Tabla: Mesas
  `CREATE TABLE IF NOT EXISTS mesas (
    id_mesa INT AUTO_INCREMENT PRIMARY KEY,
    numero_mesa INT NOT NULL UNIQUE,
    nombre_mesa VARCHAR(50) DEFAULT NULL,
    tipo_mesa ENUM('pool', 'carambola', 'snooker', 'demo') DEFAULT 'pool',
    precio_hora DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    estado ENUM('disponible', 'ocupada', 'mantenimiento', 'reservada') DEFAULT 'disponible',
    color_hex VARCHAR(7) DEFAULT '#1a1a2e',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Tabla: Sesiones
  `CREATE TABLE IF NOT EXISTS sesiones (
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
  )`,

  // Tabla: Jugadores
  `CREATE TABLE IF NOT EXISTS jugadores (
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
  )`,

  // Tabla: Partidas
  `CREATE TABLE IF NOT EXISTS partidas (
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
  )`,

  // Tabla: Categorías
  `CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    color_hex VARCHAR(7) DEFAULT '#16213e',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Tabla: Productos
  `CREATE TABLE IF NOT EXISTS productos (
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
  )`,

  // Tabla: Movimientos de inventario
  `CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    tipo_movimiento ENUM('entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo') NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    motivo VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
  )`,

  // Tabla: Clientes
  `CREATE TABLE IF NOT EXISTS clientes (
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
  )`,

  // Tabla: Consumos
  `CREATE TABLE IF NOT EXISTS consumos (
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
  )`,

  // Tabla: Pagos
  `CREATE TABLE IF NOT EXISTS pagos (
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
  )`,

  // Tabla: Configuración
  `CREATE TABLE IF NOT EXISTS configuracion (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`
];

const seedData = [
  // Categorías
  `INSERT IGNORE INTO categorias (nombre, descripcion, color_hex) VALUES 
  ('Bebidas Alcohólicas', 'Cervezas, licores, cocktails', '#e94560'),
  ('Bebidas No Alcohólicas', 'Gaseosas, jugos, agua', '#0f3460'),
  ('Snacks', 'Papas, mani, nachos', '#f39c12'),
  ('Comida Rápida', 'Hamburguesas, pizzas, etc.', '#e74c3c')`,

  // Mesas
  `INSERT IGNORE INTO mesas (numero_mesa, nombre_mesa, tipo_mesa, precio_hora, estado, color_hex) VALUES
  (1, 'Mesa 1 - Pool', 'pool', 15000, 'disponible', '#1a1a2e'),
  (2, 'Mesa 2 - Pool', 'pool', 15000, 'disponible', '#16213e'),
  (3, 'Mesa 3 - Pool', 'pool', 15000, 'disponible', '#0f3460'),
  (4, 'Mesa Premium', 'pool', 20000, 'disponible', '#e94560'),
  (5, 'Mesa Carambola', 'carambola', 18000, 'mantenimiento', '#533483')`,

  // Configuración
  `INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
  ('empresa_nombre', 'Billar Express', 'Nombre del negocio'),
  ('empresa_direccion', 'Calle Principal #123', 'Dirección del negocio'),
  ('empresa_telefono', '3001234567', 'Teléfono de contacto'),
  ('moneda', 'COP', 'Moneda del sistema'),
  ('iva', '19', 'Porcentaje de IVA'),
  ('mesas_activas', '4', 'Número de mesas activas'),
  ('password_admin', 'admin123', 'Contraseña de acceso')`,

  // Productos (sin datos para evitar errores de foreign key por ahora)
  // Jugadores (sin datos para evitar errores)
  // Clientes (sin datos)
  // Partidas (sin datos)
];

export async function runMigrations() {
  console.log('🔄 Iniciando migraciones...');
  
  try {
    // Crear tablas
    for (const sql of migrations) {
      await pool.query(sql);
      console.log('✅ Tabla creada');
    }
    
    // Insertar datos iniciales
    for (const sql of seedData) {
      try {
        await pool.query(sql);
      } catch (e) {
        // Ignorar errores de datos duplicados
        if (!e.message.includes('Duplicate')) {
          console.log('⚠️', e.message);
        }
      }
    }
    
    console.log('✅ Migraciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error en migraciones:', error.message);
    throw error;
  }
}

export default runMigrations;
