import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const { activo, busqueda } = req.query;
    
    let sql = 'SELECT * FROM clientes WHERE 1=1';
    const params = [];
    
    if (activo !== undefined) {
      sql += ' AND activo = ?';
      params.push(activo === 'true');
    }
    
    if (busqueda) {
      sql += ' AND (nombre LIKE ? OR telefono LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    
    sql += ' ORDER BY nombre';
    
    const clientes = await query(sql, params);
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener clientesTOP por consumo
router.get('/top', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const clientes = await query(`
      SELECT * FROM clientes 
      WHERE activo = TRUE AND total_consumido > 0
      ORDER BY total_consumido DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener cliente específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientes = await query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
    
    if (clientes.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(clientes[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener cuenta corriente de un cliente
router.get('/:id/cuenta', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener cliente
    const cliente = await query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
    
    if (cliente.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    // Obtener consumos pendientes
    const consumos = await query(`
      SELECT 
        c.*,
        p.nombre as producto_nombre,
        p.precio_venta
      FROM consumos c
      JOIN productos p ON c.id_producto = p.id_producto
      WHERE c.id_cliente = ? AND c.estado = 'pendiente'
      ORDER BY c.fecha_consumo DESC
    `, [id]);
    
    // Obtener historial de pagos
    const pagos = await query(`
      SELECT * FROM pagos 
      WHERE id_cliente = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [id]);
    
    // Obtener sesiones del cliente
    const sesiones = await query(`
      SELECT s.*, m.numero_mesa
      FROM sesiones s
      JOIN mesas m ON s.id_mesa = m.id_mesa
      WHERE s.id_cliente = ?
      ORDER BY s.hora_inicio DESC
      LIMIT 10
    `, [id]);
    
    res.json({
      cliente: cliente[0],
      consumos_pendientes: consumos,
      pagos,
      sesiones
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear cliente
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, email, observaciones } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `
      INSERT INTO clientes (nombre, telefono, email, observaciones)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await query(sql, [nombre, telefono || null, email || null, observaciones || null]);
    
    const nuevoCliente = await query('SELECT * FROM clientes WHERE id_cliente = ?', [result.insertId]);
    
    res.status(201).json(nuevoCliente[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, email, observaciones, activo } = req.body;
    
    const sql = `
      UPDATE clientes 
      SET nombre = ?, telefono = ?, email = ?, observaciones = ?, activo = ?
      WHERE id_cliente = ?
    `;
    
    await query(sql, [nombre, telefono, email, observaciones, activo, id]);
    
    const clienteActualizado = await query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
    
    res.json(clienteActualizado[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar cliente (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('UPDATE clientes SET activo = FALSE WHERE id_cliente = ?', [id]);
    
    res.json({ message: 'Cliente desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar abono/pago
router.post('/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodo_pago, referencia, notas } = req.body;
    
    if (!monto || monto <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }
    
    // Insertar pago
    const sqlPago = `
      INSERT INTO pagos (id_cliente, monto, metodo_pago, referencia, notas)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await query(sqlPago, [id, monto, metodo_pago || 'efectivo', referencia || null, notas || null]);
    
    // Actualizar saldo del cliente
    await query(`
      UPDATE clientes 
      SET saldo_actual = GREATEST(saldo_actual - ?, 0)
      WHERE id_cliente = ?
    `, [monto, id]);
    
    const clienteActualizado = await query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
    const pago = await query('SELECT * FROM pagos WHERE id_pago = ?', [result.insertId]);
    
    res.json({
      cliente: clienteActualizado[0],
      pago: pago[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
