import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de CORS
const corsOptions = {
  origin: function(origin, callback) {
    // En producción, permitir cualquier origen de Netlify
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME;
    
    if (isProduction) {
      // En producción permitir cualquier origen o el específico de Netlify
      callback(null, true);
      return;
    }
    
    // En desarrollo local, permitir solo localhost
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
};

// Importar rutas
import mesasRoutes from './routes/mesas.js';
import sesionesRoutes from './routes/sesiones.js';
import jugadoresRoutes from './routes/jugadores.js';
import productosRoutes from './routes/productos.js';
import clientesRoutes from './routes/clientes.js';
import consumosRoutes from './routes/consumos.js';
import categoriasRoutes from './routes/categorias.js';
import configRoutes from './routes/config.js';

const app = express();
const httpServer = createServer(app);

// Configuración de Socket.IO
const io = new Server(httpServer, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Variable global para acceder a io desde las rutas
app.set('io', io);

// Rutas API
app.use('/mesas', mesasRoutes);
app.use('/sesiones', sesionesRoutes);
app.use('/jugadores', jugadoresRoutes);
app.use('/productos', productosRoutes);
app.use('/clientes', clientesRoutes);
app.use('/consumos', consumosRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/config', configRoutes);

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de WebSocket
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Unirse a sala de mesas
  socket.on('join:mesas', () => {
    socket.join('mesas');
    console.log('Cliente joined a sala mesas');
  });

  // Eventos de mesa
  socket.on('mesa:ocupar', (data) => {
    io.to('mesas').emit('mesa:actualizada', data);
  });

  socket.on('mesa:liberar', (data) => {
    io.to('mesas').emit('mesa:actualizada', data);
  });

  // Evento de timer actualizado
  socket.on('timer:actualizar', (data) => {
    io.to('mesas').emit('sesion:tiempo', data);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Exportar io para usar en rutas
export { io };

export default httpServer;
