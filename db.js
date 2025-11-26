// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 150,  // 150 joueurs simultanés
  queueLimit: 300,       // mettre en file d’attente les requêtes
  connectTimeout: 10000, // Timeout de 10s 
  timezone: 'Z'          // UTC 
});

// Vérification automatiquement de la connexion au lancement
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log(' Connexion MariaDB réussie - pool prêt');
    conn.release();
  } catch (err) {
    console.error(' Erreur de connexion MariaDB:', err.message);
  }
})();

module.exports = pool;
