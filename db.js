import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Création du pool de connexions
export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lycee',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Fonction de test de connexion
export async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Connexion à la base de données réussie');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    return false;
  }
}

// Export par défaut (optionnel)
export default { db, testConnection };