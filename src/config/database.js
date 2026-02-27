import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'billar_system',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error al obtener conexión:', error.message);
    throw error;
  }
};

export const query = async (sql, params = []) => {
  try {
    // Usar query en lugar de execute para manejar correctamente todos los tipos de parámetros
    // especialmente LIMIT que no funciona bien con prepared statements
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Error en consulta:', error.message);
    throw error;
  }
};

export default pool;
