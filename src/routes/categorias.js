import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todas las categorías
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT c.*, COUNT(p.id_producto) as total_productos
      FROM categorias c
      LEFT JOIN productos p ON c.id_categoria = p.id_categoria AND p.estado = 'activo'
      GROUP BY c.id_categoria
      ORDER BY c.nombre
    `;
    
    const categorias = await query(sql);
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener categoría específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const categorias = await query('SELECT * FROM categorias WHERE id_categoria = ?', [id]);
    
    if (categorias.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json(categorias[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear categoría
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, color_hex } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `
      INSERT INTO categorias (nombre, descripcion, color_hex)
      VALUES (?, ?, ?)
    `;
    
    const result = await query(sql, [nombre, descripcion || null, color_hex || '#16213e']);
    
    const nuevaCategoria = await query('SELECT * FROM categorias WHERE id_categoria = ?', [result.insertId]);
    
    res.status(201).json(nuevaCategoria[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar categoría
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, color_hex } = req.body;
    
    const sql = `
      UPDATE categorias 
      SET nombre = ?, descripcion = ?, color_hex = ?
      WHERE id_categoria = ?
    `;
    
    await query(sql, [nombre, descripcion, color_hex, id]);
    
    const categoriaActualizada = await query('SELECT * FROM categorias WHERE id_categoria = ?', [id]);
    
    res.json(categoriaActualizada[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar categoría
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay productos en la categoría
    const productos = await query(
      'SELECT COUNT(*) as count FROM productos WHERE id_categoria = ? AND estado = "activo"',
      [id]
    );
    
    if (productos[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar una categoría con productos activos' 
      });
    }
    
    await query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
    
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
