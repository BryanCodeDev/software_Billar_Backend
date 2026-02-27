import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Obtener todas las configuraciones
router.get('/', async (req, res) => {
  try {
    const configs = await query('SELECT * FROM configuracion ORDER BY clave');
    
    // Convertir a objeto
    const configObj = {};
    configs.forEach(c => {
      configObj[c.clave] = c.valor;
    });
    
    res.json(configObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener configuración específica
router.get('/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    const configs = await query('SELECT * FROM configuracion WHERE clave = ?', [clave]);
    
    if (configs.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    res.json(configs[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar configuración
router.put('/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    const { valor, descripcion } = req.body;
    
    // Verificar si existe
    const existing = await query('SELECT * FROM configuracion WHERE clave = ?', [clave]);
    
    if (existing.length === 0) {
      // Crear nueva configuración
      await query(
        'INSERT INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)',
        [clave, valor, descripcion || null]
      );
    } else {
      // Actualizar
      await query(
        'UPDATE configuracion SET valor = ?, descripcion = ? WHERE clave = ?',
        [valor, descripcion, clave]
      );
    }
    
    const config = await query('SELECT * FROM configuracion WHERE clave = ?', [clave]);
    
    res.json(config[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar contraseña
router.post('/verificar-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    const config = await query("SELECT valor FROM configuracion WHERE clave = 'password_admin'");
    
    if (config.length === 0) {
      return res.json({ valido: false, error: 'Sistema no configurado' });
    }
    
    const valido = config[0].valor === password;
    res.json({ valido });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar contraseña
router.put('/password', async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;
    
    // Verificar contraseña actual
    const config = await query("SELECT valor FROM configuracion WHERE clave = 'password_admin'");
    
    if (config.length === 0 || config[0].valor !== passwordActual) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    
    await query(
      "UPDATE configuracion SET valor = ? WHERE clave = 'password_admin'",
      [passwordNuevo]
    );
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
