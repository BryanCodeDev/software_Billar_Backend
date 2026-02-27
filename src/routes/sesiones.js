import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todas las sesiones
router.get('/', async (req, res) => {
  try {
    const { estado, id_mesa, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        s.*,
        m.numero_mesa,
        m.nombre_mesa,
        m.precio_hora,
        c.nombre as nombre_cliente
      FROM sesiones s
      JOIN mesas m ON s.id_mesa = m.id_mesa
      LEFT JOIN clientes c ON s.id_cliente = c.id_cliente
      WHERE 1=1
    `;
    
    const params = [];
    
    if (estado) {
      sql += ' AND s.estado = ?';
      params.push(estado);
    }
    
    if (id_mesa) {
      sql += ' AND s.id_mesa = ?';
      params.push(id_mesa);
    }
    
    sql += ' ORDER BY s.hora_inicio DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const sesiones = await query(sql, params);
    res.json(sesiones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener sesión específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT 
        s.*,
        m.numero_mesa,
        m.nombre_mesa,
        m.precio_hora,
        c.nombre as nombre_cliente
      FROM sesiones s
      JOIN mesas m ON s.id_mesa = m.id_mesa
      LEFT JOIN clientes c ON s.id_cliente = c.id_cliente
      WHERE s.id_sesion = ?
    `;
    
    const sesiones = await query(sql, [id]);
    
    if (sesiones.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    res.json(sesiones[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pausar sesión
router.post('/:id/pausar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sesion = await query('SELECT * FROM sesiones WHERE id_sesion = ?', [id]);
    
    if (sesion.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    if (sesion[0].estado !== 'activa') {
      return res.status(400).json({ error: 'La sesión no está activa' });
    }
    
    await query('UPDATE sesiones SET estado = "pausada" WHERE id_sesion = ?', [id]);
    
    const sesionActualizada = await query('SELECT * FROM sesiones WHERE id_sesion = ?', [id]);
    
    // Notificar a todos
    const io = req.app.get('io');
    io.to('mesas').emit('sesion:pausada', sesionActualizada[0]);
    
    res.json(sesionActualizada[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reanudar sesión
router.post('/:id/reanudar', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sesion = await query('SELECT * FROM sesiones WHERE id_sesion = ?', [id]);
    
    if (sesion.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    if (sesion[0].estado !== 'pausada') {
      return res.status(400).json({ error: 'La sesión no está pausada' });
    }
    
    await query('UPDATE sesiones SET estado = "activa" WHERE id_sesion = ?', [id]);
    
    const sesionActualizada = await query('SELECT * FROM sesiones WHERE id_sesion = ?', [id]);
    
    // Notificar a todos
    const io = req.app.get('io');
    io.to('mesas').emit('sesion:reanudada', sesionActualizada[0]);
    
    res.json(sesionActualizada[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalizar sesión
router.post('/:id/finalizar', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener datos de la sesión
    const sesion = await query('SELECT * FROM sesiones WHERE id_sesion = ?', [id]);
    
    if (sesion.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    if (sesion[0].estado === 'finalizada') {
      return res.status(400).json({ error: 'La sesión ya está finalizada' });
    }
    
    const { id_mesa, hora_inicio } = sesion[0];
    
    // Calcular tiempo y costo
    const sqlCalculo = `
      SELECT 
        TIMESTAMPDIFF(MINUTE, ?, NOW()) as minutos,
        m.precio_hora
      FROM mesas m WHERE m.id_mesa = ?
    `;
    const calculo = await query(sqlCalculo, [hora_inicio, id_mesa]);
    
    const minutos = calculo[0].minutos > 0 ? calculo[0].minutos : 0;
    const costo = Math.round((minutos / 60) * calculo[0].precio_hora);
    
    // Actualizar sesión
    await query(`
      UPDATE sesiones 
      SET hora_fin = NOW(), 
          tiempo_total_minutos = ?, 
          costo_total = ?,
          estado = 'finalizada'
      WHERE id_sesion = ?
    `, [minutos, costo, id]);
    
    // Liberar la mesa
    await query('UPDATE mesas SET estado = "disponible" WHERE id_mesa = ?', [id_mesa]);
    
    // Obtener sesión actualizada
    const sesionFinalizada = await query(`
      SELECT s.*, m.numero_mesa, m.nombre_mesa, m.precio_hora
      FROM sesiones s
      JOIN mesas m ON s.id_mesa = m.id_mesa
      WHERE s.id_sesion = ?
    `, [id]);
    
    // Notificar a todos
    const io = req.app.get('io');
    io.to('mesas').emit('sesion:finalizada', {
      sesion: sesionFinalizada[0],
      id_mesa
    });
    
    const mesaLiberada = await query('SELECT * FROM mesas WHERE id_mesa = ?', [id_mesa]);
    io.to('mesas').emit('mesa:actualizada', mesaLiberada[0]);
    
    res.json({
      ...sesionFinalizada[0],
      minutos,
      costo_total: costo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tiempo actual de una sesión activa
router.get('/:id/tiempo', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sesion = await query(`
      SELECT 
        s.*,
        m.precio_hora,
        TIMESTAMPDIFF(MINUTE, s.hora_inicio, NOW()) as minutos_transcurridos
      FROM sesiones s
      JOIN mesas m ON s.id_mesa = m.id_mesa
      WHERE s.id_sesion = ?
    `, [id]);
    
    if (sesion.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    const s = sesion[0];
    const costo = Math.round((s.minutos_transcurridos / 60) * s.precio_hora);
    
    res.json({
      id_sesion: s.id_sesion,
      minutos: s.minutos_transcurridos,
      costo,
      estado: s.estado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
