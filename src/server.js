import dotenv from 'dotenv';
import httpServer from './app.js';
import { query } from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Verificar conexión a la base de datos
async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('✅ Conexión a MySQL exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
}

// Iniciar servidor
async function startServer() {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('⚠️  El servidor iniziará sin conexión a la base de datos');
    console.log('📝 Asegúrate de ejecutar el script database.sql en MySQL');
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 WebSocket disponible en ws://localhost:${PORT}`);
  });
}

startServer();
