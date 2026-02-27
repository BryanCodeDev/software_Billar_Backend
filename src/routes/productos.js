import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const { id_categoria, estado, busqueda } = req.query;
    
    let sql = `
      SELECT p.*, c.nombre as categoria_nombre, c.color_hex as categoria_color
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE 1=1
    `;
    const params = [];
    
    if (id_categoria) {
      sql += ' AND p.id_categoria = ?';
      params.push(id_categoria);
    }
    
    if (estado) {
      sql += ' AND p.estado = ?';
      params.push(estado);
    }
    
    if (busqueda) {
      sql += ' AND (p.nombre LIKE ? OR p.codigo_barras LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    
    sql += ' ORDER BY c.nombre, p.nombre';
    
    const productos = await query(sql, params);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener productos con stock bajo
router.get('/bajo-stock', async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.stock_actual <= p.stock_minimo AND p.estado = 'activo'
      ORDER BY (p.stock_minimo - p.stock_actual) DESC
    `;
    
    const productos = await query(sql);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener producto específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productos = await query(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.id_producto = ?
    `, [id]);
    
    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(productos[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear producto
router.post('/', async (req, res) => {
  try {
    const { 
      id_categoria, nombre, codigo_barras, precio_venta, precio_compra,
      stock_actual, stock_minimo, unidad_medida, imagen_url
    } = req.body;
    
    if (!id_categoria || !nombre || !precio_venta) {
      return res.status(400).json({ error: 'Categoría, nombre y precio son requeridos' });
    }
    
    const sql = `
      INSERT INTO productos 
      (id_categoria, nombre, codigo_barras, precio_venta, precio_compra, 
       stock_actual, stock_minimo, unidad_medida, imagen_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      id_categoria, nombre, codigo_barras || null, precio_venta,
      precio_compra || 0, stock_actual || 0, stock_minimo || 5,
      unidad_medida || 'und', imagen_url || null
    ]);
    
    const nuevoProducto = await query('SELECT * FROM productos WHERE id_producto = ?', [result.insertId]);
    
    // Registrar movimiento de inventario inicial
    if (stock_actual > 0) {
      await query(`
        INSERT INTO movimientos_inventario 
        (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo)
        VALUES (?, 'entrada', ?, 0, ?, 'Stock inicial')
      `, [result.insertId, stock_actual, stock_actual]);
    }
    
    res.status(201).json(nuevoProducto[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar producto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      id_categoria, nombre, codigo_barras, precio_venta, precio_compra,
      stock_minimo, unidad_medida, estado, imagen_url
    } = req.body;
    
    const sql = `
      UPDATE productos 
      SET id_categoria = ?, nombre = ?, codigo_barras = ?, precio_venta = ?,
          precio_compra = ?, stock_minimo = ?, unidad_medida = ?, 
          estado = ?, imagen_url = ?
      WHERE id_producto = ?
    `;
    
    await query(sql, [
      id_categoria, nombre, codigo_barras, precio_venta, precio_compra,
      stock_minimo, unidad_medida, estado, imagen_url, id
    ]);
    
    const productoActualizado = await query('SELECT * FROM productos WHERE id_producto = ?', [id]);
    
    // Notificar si stock bajo
    const io = req.app.get('io');
    if (productoActualizado[0].stock_actual <= productoActualizado[0].stock_minimo) {
      io.emit('inventario:bajo_stock', productoActualizado[0]);
    }
    
    res.json(productoActualizado[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar producto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('UPDATE productos SET estado = "inactivo" WHERE id_producto = ?', [id]);
    
    res.json({ message: 'Producto desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Entrada de inventario
router.post('/inventario/entrada', async (req, res) => {
  try {
    const { id_producto, cantidad, motivo } = req.body;
    
    if (!id_producto || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Producto y cantidad son requeridos' });
    }
    
    // Obtener stock actual
    const producto = await query('SELECT * FROM productos WHERE id_producto = ?', [id_producto]);
    
    if (producto.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const stock_anterior = producto[0].stock_actual;
    const stock_nuevo = stock_anterior + cantidad;
    
    // Actualizar stock
    await query('UPDATE productos SET stock_actual = ? WHERE id_producto = ?', [stock_nuevo, id_producto]);
    
    // Registrar movimiento
    await query(`
      INSERT INTO movimientos_inventario 
      (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo)
      VALUES (?, 'entrada', ?, ?, ?, ?)
    `, [id_producto, cantidad, stock_anterior, stock_nuevo, motivo || 'Entrada de inventario']);
    
    const productoActualizado = await query('SELECT * FROM productos WHERE id_producto = ?', [id_producto]);
    
    res.json(productoActualizado[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Salida de inventario
router.post('/inventario/salida', async (req, res) => {
  try {
    const { id_producto, cantidad, motivo } = req.body;
    
    if (!id_producto || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Producto y cantidad son requeridos' });
    }
    
    // Obtener stock actual
    const producto = await query('SELECT * FROM productos WHERE id_producto = ?', [id_producto]);
    
    if (producto.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const stock_anterior = producto[0].stock_actual;
    
    if (stock_anterior < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }
    
    const stock_nuevo = stock_anterior - cantidad;
    
    // Actualizar stock
    await query('UPDATE productos SET stock_actual = ? WHERE id_producto = ?', [stock_nuevo, id_producto]);
    
    // Actualizar estado si stock es 0
    if (stock_nuevo === 0) {
      await query('UPDATE productos SET estado = "agotado" WHERE id_producto = ?', [id_producto]);
    }
    
    // Registrar movimiento
    await query(`
      INSERT INTO movimientos_inventario 
      (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo)
      VALUES (?, 'salida', ?, ?, ?, ?)
    `, [id_producto, cantidad, stock_anterior, stock_nuevo, motivo || 'Salida de inventario']);
    
    const productoActualizado = await query('SELECT * FROM productos WHERE id_producto = ?', [id_producto]);
    
    // Notificar si stock bajo
    const io = req.app.get('io');
    if (productoActualizado[0].stock_actual <= productoActualizado[0].stock_minimo) {
      io.emit('inventario:bajo_stock', productoActualizado[0]);
    }
    
    res.json(productoActualizado[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de movimientos
router.get('/:id/movimientos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const movimientos = await query(`
      SELECT 
        m.*,
        p.nombre as producto_nombre
      FROM movimientos_inventario m
      JOIN productos p ON m.id_producto = p.id_producto
      WHERE m.id_producto = ?
      ORDER BY m.created_at DESC
    `, [id]);
    
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
