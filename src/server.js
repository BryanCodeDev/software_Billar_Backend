import dotenv from 'dotenv';
import httpServer from './app.js';
import { query } from './config/database.js';
import { runMigrations } from './migrate.js';

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
  } else {
    // Ejecutar migraciones automáticamente
    console.log('🔄 Verificando estructura de base de datos...');
    await runMigrations();
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const url = isProduction ? `https://softwarebillarbackend-production.up.railway.app` : `http://localhost:${PORT}`;
    console.log(`🚀 Servidor corriendo en ${url}`);
    console.log(`📡 WebSocket disponible en ${isProduction ? 'wss://' : 'ws://'}softwarebillarbackend-production.up.railway.app`);
  });
}

startServer();
