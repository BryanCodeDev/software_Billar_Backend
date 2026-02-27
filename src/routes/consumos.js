import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todos los consumos
router.get('/', async (req, res) => {
  try {
    const { id_cliente, id_sesion, estado, fecha_inicio, fecha_fin } = req.query;
    
    let sql = `
      SELECT 
        c.*,
        p.nombre as producto_nombre,
        p.precio_venta,
        cl.nombre as cliente_nombre,
        m.numero_mesa
      FROM consumos c
      JOIN productos p ON c.id_producto = p.id_producto
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      LEFT JOIN sesiones s ON c.id_sesion = s.id_sesion
      LEFT JOIN mesas m ON s.id_mesa = m.id_mesa
      WHERE 1=1
    `;
    const params = [];
    
    if (id_cliente) {
      sql += ' AND c.id_cliente = ?';
      params.push(id_cliente);
    }
    
    if (id_sesion) {
      sql += ' AND c.id_sesion = ?';
      params.push(id_sesion);
    }
    
    if (estado) {
      sql += ' AND c.estado = ?';
      params.push(estado);
    }
    
    if (fecha_inicio) {
      sql += ' AND DATE(c.fecha_consumo) >= ?';
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      sql += ' AND DATE(c.fecha_consumo) <= ?';
      params.push(fecha_fin);
    }
    
    sql += ' ORDER BY c.fecha_consumo DESC';
    
    const consumos = await query(sql, params);
    res.json(consumos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar consumo
router.post('/', async (req, res) => {
  try {
    const { id_cliente, id_producto, cantidad, id_sesion } = req.body;
    
    if (!id_cliente || !id_producto || !cantidad) {
      return res.status(400).json({ error: 'Cliente, producto y cantidad son requeridos' });
    }
    
    // Verificar stock disponible
    const producto = await query('SELECT * FROM productos WHERE id_producto = ?', [id_producto]);
    
    if (producto.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    if (producto[0].stock_actual < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }
    
    const precio_unitario = producto[0].precio_venta;
    const subtotal = precio_unitario * cantidad;
    
    // Insertar consumo
    const sqlConsumo = `
      INSERT INTO consumos 
      (id_cliente, id_producto, cantidad, precio_unitario, subtotal, id_sesion, fecha_consumo, estado)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), 'pendiente')
    `;
    
    const result = await query(sqlConsumo, [id_cliente, id_producto, cantidad, precio_unitario, subtotal, id_sesion || null]);
    
    // Descontar del inventario
    await query(`
      UPDATE productos 
      SET stock_actual = stock_actual - ?
      WHERE id_producto = ?
    `, [cantidad, id_producto]);
    
    // Registrar movimiento de inventario
    await query(`
      INSERT INTO movimientos_inventario 
      (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo)
      SELECT ?, 'salida', ?, stock_actual, stock_actual - ?, 'Consumo en mesa'
      FROM productos WHERE id_producto = ?
    `, [id_producto, cantidad, cantidad, id_producto]);
    
    // Actualizar saldo del cliente
    await query(`
      UPDATE clientes 
      SET saldo_actual = saldo_actual + ?,
          total_consumido = total_consumido + ?,
          visitas = visitas + 1
      WHERE id_cliente = ?
    `, [subtotal, subtotal, id_cliente]);
    
    const consumo = await query('SELECT * FROM consumos WHERE id_consumo = ?', [result.insertId]);
    const clienteActualizado = await query('SELECT * FROM clientes WHERE id_cliente = ?', [id_cliente]);
    
    // Notificar si stock bajo
    const io = req.app.get('io');
    const productoActualizado = await query('SELECT * FROM productos WHERE id_producto = ?', [id_producto]);
    if (productoActualizado[0].stock_actual <= productoActualizado[0].stock_minimo) {
      io.emit('inventario:bajo_stock', productoActualizado[0]);
    }
    
    res.status(201).json({
      consumo: consumo[0],
      cliente: clienteActualizado[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar consumo como pagado
router.put('/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const consumo = await query('SELECT * FROM consumos WHERE id_consumo = ?', [id]);
    
    if (consumo.length === 0) {
      return res.status(404).json({ error: 'Consumo no encontrado' });
    }
    
    if (consumo[0].estado === 'pagado') {
      return res.status(400).json({ error: 'El consumo ya está pagado' });
    }
    
    await query('UPDATE consumos SET estado = "pagado" WHERE id_consumo = ?', [id]);
    
    // Limpiar saldo del cliente (el consumo ya se pagó)
    await query(`
      UPDATE clientes 
      SET saldo_actual = GREATEST(saldo_actual - ?, 0)
      WHERE id_cliente = ?
    `, [consumo[0].subtotal, consumo[0].id_cliente]);
    
    const consumoActualizado = await query(`
      SELECT c.*, p.nombre as producto_nombre
      FROM consumos c
      JOIN productos p ON c.id_producto = p.id_producto
      WHERE c.id_consumo = ?
    `, [id]);
    
    res.json(consumoActualizado[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancelar consumo
router.put('/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const consumo = await query('SELECT * FROM consumos WHERE id_consumo = ?', [id]);
    
    if (consumo.length === 0) {
      return res.status(404).json({ error: 'Consumo no encontrado' });
    }
    
    if (consumo[0].estado === 'cancelado') {
      return res.status(400).json({ error: 'El consumo ya está cancelado' });
    }
    
    // Devolver stock
    await query(`
      UPDATE productos 
      SET stock_actual = stock_actual + ?
      WHERE id_producto = ?
    `, [consumo[0].cantidad, consumo[0].id_producto]);
    
    // Actualizar saldo del cliente
    await query(`
      UPDATE clientes 
      SET saldo_actual = GREATEST(saldo_actual - ?, 0)
      WHERE id_cliente = ?
    `, [consumo[0].subtotal, consumo[0].id_cliente]);
    
    // Marcar como cancelado
    await query('UPDATE consumos SET estado = "cancelado" WHERE id_consumo = ?', [id]);
    
    const consumoCancelado = await query('SELECT * FROM consumos WHERE id_consumo = ?', [id]);
    
    res.json(consumoCancelado[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener consumo específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const consumos = await query(`
      SELECT 
        c.*,
        p.nombre as producto_nombre,
        cl.nombre as cliente_nombre
      FROM consumos c
      JOIN productos p ON c.id_producto = p.id_producto
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      WHERE c.id_consumo = ?
    `, [id]);
    
    if (consumos.length === 0) {
      return res.status(404).json({ error: 'Consumo no encontrado' });
    }
    
    res.json(consumos[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
