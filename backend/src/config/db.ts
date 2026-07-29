import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Create a mysql2 connection pool using environment credentials
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'retail_crm',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0
});

// Helper: run a parameterized query
export const query = async (sql: string, params?: any[]): Promise<any> => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// Helper: run multiple queries inside an atomic transaction
export const transaction = async (callback: (conn: mysql.PoolConnection) => Promise<any>): Promise<any> => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export default pool;
