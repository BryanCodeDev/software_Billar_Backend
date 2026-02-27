import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todos los jugadores
router.get('/', async (req, res) => {
  try {
    const { activo, busqueda } = req.query;
    
    let sql = 'SELECT * FROM jugadores WHERE 1=1';
    const params = [];
    
    if (activo !== undefined) {
      sql += ' AND activo = ?';
      params.push(activo === 'true');
    }
    
    if (busqueda) {
      sql += ' AND (nombre LIKE ? OR apodo LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    
    sql += ' ORDER BY puntos_totales DESC';
    
    const jugadores = await query(sql, params);
    res.json(jugadores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas de un jugador
router.get('/:id/estadisticas', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener jugador
    const jugador = await query('SELECT * FROM jugadores WHERE id_jugador = ?', [id]);
    
    if (jugador.length === 0) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    // Obtener historial de partidas
    const partidas = await query(`
      SELECT 
        p.*,
        j1.nombre as nombre_jugador1,
        j1.apodo as apodo_jugador1,
        j2.nombre as nombre_jugador2,
        j2.apodo as apodo_jugador2,
        m.numero_mesa
      FROM partidas p
      JOIN jugadores j1 ON p.id_jugador1 = j1.id_jugador
      JOIN jugadores j2 ON p.id_jugador2 = j2.id_jugador
      JOIN mesas m ON p.id_mesa = m.id_mesa
      WHERE p.id_jugador1 = ? OR p.id_jugador2 = ?
      ORDER BY p.fecha_inicio DESC
      LIMIT 20
    `, [id, id]);
    
    // Calcular estadísticas por modalidad
    const estadisticasPool = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN (ganador = 'jugador1' AND id_jugador1 = ?) OR (ganador = 'jugador2' AND id_jugador2 = ?) THEN 1 ELSE 0 END) as ganadas,
        SUM(CASE WHEN id_jugador1 = ? THEN bolas_jugador1 ELSE bolas_jugador2 END) as bolas_metidas
      FROM partidas 
      WHERE modalidad = 'pool' AND estado = 'finalizada' AND (id_jugador1 = ? OR id_jugador2 = ?)
    `, [id, id, id, id, id]);

    const estadisticas3Bandas = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN (ganador = 'jugador1' AND id_jugador1 = ?) OR (ganador = 'jugador2' AND id_jugador2 = ?) THEN 1 ELSE 0 END) as ganadas,
        SUM(CASE WHEN id_jugador1 = ? THEN puntos_jugador1 ELSE puntos_jugador2 END) as carambolas
      FROM partidas 
      WHERE modalidad = '3_bandas' AND estado = 'finalizada' AND (id_jugador1 = ? OR id_jugador2 = ?)
    `, [id, id, id, id, id]);
    
    const totalPartidas = (estadisticasPool[0].total || 0) + (estadisticas3Bandas[0].total || 0);
    const totalGanadas = (estadisticasPool[0].ganadas || 0) + (estadisticas3Bandas[0].ganadas || 0);
    const winRate = totalPartidas > 0 ? Math.round((totalGanadas / totalPartidas) * 100) : 0;
    
    res.json({
      jugador: jugador[0],
      partidas,
      estadisticas: {
        total_partidas: totalPartidas,
        ganadas: totalGanadas,
        perdidas: totalPartidas - totalGanadas,
        win_rate: winRate,
        pool: {
          partidas: estadisticasPool[0].total || 0,
          ganadas: estadisticasPool[0].ganadas || 0,
          bolas_metidas: estadisticasPool[0].bolas_metidas || 0
        },
        tres_bandas: {
          partidas: estadisticas3Bandas[0].total || 0,
          ganadas: estadisticas3Bandas[0].ganadas || 0,
          carambolas: estadisticas3Bandas[0].carambolas || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener jugador específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const jugadores = await query('SELECT * FROM jugadores WHERE id_jugador = ?', [id]);
    
    if (jugadores.length === 0) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    res.json(jugadores[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear jugador
router.post('/', async (req, res) => {
  try {
    const { nombre, apodo, telefono, email, nivel, observaciones } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `
      INSERT INTO jugadores (nombre, apodo, telefono, email, nivel, observaciones)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      nombre,
      apodo || null,
      telefono || null,
      email || null,
      nivel || 'principiante',
      observaciones || null
    ]);
    
    const nuevoJugador = await query('SELECT * FROM jugadores WHERE id_jugador = ?', [result.insertId]);
    
    res.status(201).json(nuevoJugador[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar jugador
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apodo, telefono, email, nivel, observaciones, activo, puntos_totales, partidas_jugadas, partidas_ganadas } = req.body;
    
    const sql = `
      UPDATE jugadores 
      SET nombre = ?, apodo = ?, telefono = ?, email = ?, nivel = ?, 
          observaciones = ?, activo = ?, puntos_totales = ?, 
          partidas_jugadas = ?, partidas_ganadas = ?
      WHERE id_jugador = ?
    `;
    
    await query(sql, [
      nombre, apodo, telefono, email, nivel, observaciones,
      activo, puntos_totales, partidas_jugadas, partidas_ganadas, id
    ]);
    
    const jugadorActualizado = await query('SELECT * FROM jugadores WHERE id_jugador = ?', [id]);
    
    res.json(jugadorActualizado[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar jugador (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('UPDATE jugadores SET activo = FALSE WHERE id_jugador = ?', [id]);
    
    res.json({ message: 'Jugador desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar partida con puntuación según modalidad de billar
router.post('/partidas', async (req, res) => {
  try {
    const { 
      id_jugador1, 
      id_jugador2, 
      id_mesa, 
      modalidad,           // 'pool', '3_bandas', 'carambola'
      tipo_partida,        // 'clasificado', 'libre'
      puntos_jugador1,    // Para 3 bandas: puntos/carambolas
      puntos_jugador2,
      bolas_jugador1,     // Para pool: bolas metidas
      bolas_jugador2,
      bola8_perdida1,     // Si perdió por meter bola 8 antes de tiempo
      bola8_perdida2,
      puntos_juego        // Puntos a jugar (50, 100, etc para 3 bandas)
    } = req.body;
    
    if (!id_jugador1 || !id_jugador2 || !id_mesa) {
      return res.status(400).json({ error: 'Jugadores y mesa son requeridos' });
    }
    
    // Determinar ganador según la modalidad
    let ganador = null;
    let puntosGanadosJ1 = 0;
    let puntosGanadosJ2 = 0;
    
    // Modalidad pool
    if (modalidad === 'pool') {
      const b1 = bolas_jugador1 || 0;
      const b2 = bolas_jugador2 || 0;
      
      // En pool clasificado: penalización por perder antes de tiempo
      if (tipo_partida === 'clasificado') {
        if (bola8_perdida1 === true && bola8_perdida2 === true) {
          // Ambos perdieron = forfeit, nadie gana
          winner = 'empate';
        } else if (bola8_perdida1 === true) {
          winner = 'jugador2';
        } else if (bola8_perdida2 === true) {
          winner = 'jugador1';
        } else {
          // Gana quien tenga más bolas
          if (b1 > b2) winner = 'jugador1';
          else if (b2 > b1) winner = 'jugador2';
          else winner = 'empate';
        }
      } else {
        // Libre: simplemente quien meta más bolas
        if (b1 > b2) winner = 'jugador1';
        else if (b2 > b1) winner = 'jugador2';
        else winner = 'empate';
      }
      
      // Puntuación pool:
      // - 1 punto por cada bola metida
      // - 5 puntos bonus por ganar
      const ptsGanador = 5;
      puntosGanadosJ1 = b1 + (winner === 'jugador1' ? ptsGanador : 0);
      puntosGanadosJ2 = b2 + (winner === 'jugador2' ? ptsGanador : 0);
      
    } 
    // Modalidad 3 bandas o carambola
    else if (modalidad === '3_bandas' || modalidad === 'carambola') {
      const p1 = puntos_jugador1 || 0;
      const p2 = puntos_jugador2 || 0;
      
      // Gana quien llegue primero a los puntos del juego
      if (puntos_juego && puntos_juego > 0) {
        if (p1 >= puntos_juego && p1 > p2) winner = 'jugador1';
        else if (p2 >= puntos_juego && p2 > p1) winner = 'jugador2';
        else if (p1 === p2 && p1 >= puntos_juego) winner = 'empate';
        else {
          // Todavía no llega nadie, gana quien tenga más
          if (p1 > p2) winner = 'jugador1';
          else if (p2 > p1) winner = 'jugador2';
          else winner = 'empate';
        }
      } else {
        // Sin límite, gana quien tenga más
        if (p1 > p2) winner = 'jugador1';
        else if (p2 > p1) winner = 'jugador2';
        else winner = 'empate';
      }
      
      // Puntuación 3 bandas:
      // - Puntos = carambolas realizadas
      // - 3 puntos bonus por ganar
      const ptsGanador = 3;
      puntosGanadosJ1 = p1 + (winner === 'jugador1' ? ptsGanador : 0);
      puntosGanadosJ2 = p2 + (winner === 'jugador2' ? ptsGanador : 0);
    }
    // Modalidad por defecto
    else {
      const p1 = puntos_jugador1 || 0;
      const p2 = puntos_jugador2 || 0;
      
      if (p1 > p2) winner = 'jugador1';
      else if (p2 > p1) winner = 'jugador2';
      else winner = 'empate';
      
      const ptsGanador = 3;
      puntosGanadosJ1 = p1 + (winner === 'jugador1' ? ptsGanador : 0);
      puntosGanadosJ2 = p2 + (winner === 'jugador2' ? ptsGanador : 0);
    }
    
    const winner = winner || 'empate';
    
    // Insertar partida
    const sqlPartida = `
      INSERT INTO partidas 
      (id_jugador1, id_jugador2, id_mesa, modalidad, tipo_partida,
       puntos_jugador1, puntos_jugador2, bolas_jugador1, bolas_jugador2,
       bola8_perdida1, bola8_perdida2, puntos_juego, 
       ganador, fecha_inicio, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'finalizada')
    `;
    
    const result = await query(sqlPartida, [
      id_jugador1, id_jugador2, id_mesa, modalidad || 'pool', tipo_partida || 'clasificado',
      puntos_jugador1 || 0, puntos_jugador2 || 0, bolas_jugador1 || 0, bolas_jugador2 || 0,
      bola8_perdida1 || false, bola8_perdida2 || false, puntos_juego || null,
      winner
    ]);
    
    // Actualizar estadísticas de los jugadores
    // Jugador 1
    await query(`
      UPDATE jugadores 
      SET partidas_jugadas = partidas_jugadas + 1,
          puntos_totales = puntos_totales + ?,
          partidas_ganadas = partidas_ganadas + ?,
          ultime_partida = NOW()
      WHERE id_jugador = ?
    `, [puntosGanadosJ1, winner === 'jugador1' ? 1 : 0, id_jugador1]);
    
    // Jugador 2
    await query(`
      UPDATE jugadores 
      SET partidas_jugadas = partidas_jugadas + 1,
          puntos_totales = puntos_totales + ?,
          partidas_ganadas = partidas_ganadas + ?,
          ultime_partida = NOW()
      WHERE id_jugador = ?
    `, [puntosGanadosJ2, winner === 'jugador2' ? 1 : 0, id_jugador2]);
    
    const partida = await query('SELECT * FROM partidas WHERE id_partida = ?', [result.insertId]);
    
    res.status(201).json({
      ...partida[0],
      puntos_ganados_j1: puntosGanadosJ1,
      puntos_ganados_j2: puntosGanadosJ2
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener ranking de jugadores
router.get('/ranking/top', async (req, res) => {
  try {
    const { limit = 10, modalidad } = req.query;
    
    let sql = `
      SELECT 
        id_jugador,
        nombre,
        apodo,
        puntos_totales,
        COALESCE(partidas_jugadas, 0) as partidas_jugadas,
        COALESCE(partidas_ganadas, 0) as partidas_ganadas,
        nivel,
        CASE 
          WHEN COALESCE(partidas_jugadas, 0) > 0 
          THEN ROUND((COALESCE(partidas_ganadas, 0) / COALESCE(partidas_jugadas, 0)) * 100, 1)
          ELSE 0
        END as win_rate
      FROM jugadores
      WHERE activo = TRUE
    `;
    
    if (modalidad) {
      // Filtrar por modalidad si se especifica
      sql += ` AND EXISTS (
        SELECT 1 FROM partidas p 
        WHERE (p.id_jugador1 = jugadores.id_jugador OR p.id_jugador2 = jugadores.id_jugador)
        AND p.modalidad = ?
      )`;
    }
    
    sql += ' ORDER BY puntos_totales DESC LIMIT ?';
    
    const params = modalidad ? [modalidad, parseInt(limit)] : [parseInt(limit)];
    const ranking = await query(sql, params);
    
    res.json(ranking);
  } catch (error) {
    console.error('Error en ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
