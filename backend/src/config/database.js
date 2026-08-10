const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './database/soporte.db';
const dbDir = path.dirname(dbPath);

// Crea la carpeta de la base de datos si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Mejora rendimiento y seguridad de escritura concurrente
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
