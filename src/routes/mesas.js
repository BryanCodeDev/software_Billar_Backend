import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todas las mesas con información de sesión activa
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        m.*,
        s.id_sesion,
        s.hora_inicio,
        s.estado as estado_sesion,
        TIMESTAMPDIFF(MINUTE, s.hora_inicio, NOW()) AS minutos_transcurridos,
        ROUND((TIMESTAMPDIFF(MINUTE, s.hora_inicio, NOW()) / 60) * m.precio_hora, 2) AS costo_actual
      FROM mesas m
      LEFT JOIN sesiones s ON m.id_mesa = s.id_mesa AND s.estado = 'activa'
      ORDER BY m.numero_mesa ASC
    `;
    const mesas = await query(sql);
    res.json(mesas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener mesa específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        m.*,
        s.id_sesion,
        s.hora_inicio,
        s.estado as estado_sesion,
        TIMESTAMPDIFF(MINUTE, s.hora_inicio, NOW()) AS minutos_transcurridos,
        ROUND((TIMESTAMPDIFF(MINUTE, s.hora_inicio, NOW()) / 60) * m.precio_hora, 2) AS costo_actual
      FROM mesas m
      LEFT JOIN sesiones s ON m.id_mesa = s.id_mesa AND s.estado = 'activa'
      WHERE m.id_mesa = ?
    `;
    const mesas = await query(sql, [id]);
    
    if (mesas.length === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    res.json(mesas[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear mesa
router.post('/', async (req, res) => {
  try {
    const { numero_mesa, nombre_mesa, tipo_mesa, precio_hora, color_hex } = req.body;
    
    const sql = `
      INSERT INTO mesas (numero_mesa, nombre_mesa, tipo_mesa, precio_hora, color_hex)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      numero_mesa, 
      nombre_mesa || null, 
      tipo_mesa || 'pool', 
      precio_hora || 0, 
      color_hex || '#1a1a2e'
    ]);
    
    const nuevaMesa = await query('SELECT * FROM mesas WHERE id_mesa = ?', [result.insertId]);
    
    // Notificar a todos los clientes
    const io = req.app.get('io');
    io.to('mesas').emit('mesa:creada', nuevaMesa[0]);
    
    res.status(201).json(nuevaMesa[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar mesa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_mesa, tipo_mesa, precio_hora, estado, color_hex } = req.body;
    
    const sql = `
      UPDATE mesas 
      SET nombre_mesa = ?, tipo_mesa = ?, precio_hora = ?, estado = ?, color_hex = ?
      WHERE id_mesa = ?
    `;
    
    await query(sql, [nombre_mesa, tipo_mesa, precio_hora, estado, color_hex, id]);
    
    const mesaActualizada = await query('SELECT * FROM mesas WHERE id_mesa = ?', [id]);
    
    // Notificar a todos los clientes
    const io = req.app.get('io');
    io.to('mesas').emit('mesa:actualizada', mesaActualizada[0]);
    
    res.json(mesaActualizada[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar mesa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay sesiones activas
    const sesionesActivas = await query(
      'SELECT COUNT(*) as count FROM sesiones WHERE id_mesa = ? AND estado = "activa"',
      [id]
    );
    
    if (sesionesActivas[0].count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una mesa con sesión activa' });
    }
    
    await query('DELETE FROM mesas WHERE id_mesa = ?', [id]);
    
    // Notificar a todos los clientes
    const io = req.app.get('io');
    io.to('mesas').emit('mesa:eliminada', { id_mesa: parseInt(id) });
    
    res.json({ message: 'Mesa eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar sesión en una mesa
router.post('/:id/iniciar', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente, notas } = req.body;
    
    // Verificar que la mesa esté disponible
    const mesa = await query('SELECT * FROM mesas WHERE id_mesa = ?', [id]);
    
    if (mesa.length === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    if (mesa[0].estado !== 'disponible') {
      return res.status(400).json({ error: 'La mesa no está disponible' });
    }
    
    // Actualizar estado de la mesa
    await query('UPDATE mesas SET estado = "ocupada" WHERE id_mesa = ?', [id]);
    
    // Crear nueva sesión
    const sqlSesion = `
      INSERT INTO sesiones (id_mesa, hora_inicio, id_cliente, estado, notas)
      VALUES (?, NOW(), ?, 'activa', ?)
    `;
    
    const result = await query(sqlSesion, [id, id_cliente || null, notas || null]);
    
    // Obtener la sesión creada
    const sesion = await query('SELECT * FROM sesiones WHERE id_sesion = ?', [result.insertId]);
    
    // Notificar a todos los clientes
    const io = req.app.get('io');
    
    const mesaActualizada = await query('SELECT * FROM mesas WHERE id_mesa = ?', [id]);
    io.to('mesas').emit('mesa:actualizada', {
      ...mesaActualizada[0],
      sesion: sesion[0]
    });
    
    res.status(201).json(sesion[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
