// Database abstraction layer - supports PostgreSQL (production) and SQLite (dev)
const logger = require('./logger');

let pool = null;
let sqliteDb = null;
// PostgreSQL uniquement si DATABASE_URL commence par postgres:// ou postgresql://
const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

if (isPostgres) {
    const { Pool } = require('pg');
    pool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    logger.info('Base de données PostgreSQL connectée');
} else {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = process.env.DB_PATH || './database.sqlite';
    sqliteDb = new sqlite3.Database(dbPath);
    logger.info('Base de données SQLite connectée: ' + dbPath);
}

// Unified query interface
// PostgreSQL uses $1, $2... ; SQLite uses ?
async function query(sql, params = []) {
    if (isPostgres) {
        // Convert ? placeholders to $1, $2... for PostgreSQL
        let idx = 0;
        const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
        // Convert SQLite-specific syntax to PostgreSQL
        const finalSql = pgSql
            .replace(/datetime\('now'\)/gi, 'NOW()')
            .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
            .replace(/INSERT OR IGNORE/gi, 'INSERT')
            .replace(/BOOLEAN DEFAULT FALSE/gi, 'BOOLEAN DEFAULT FALSE');
        
        const result = await pool.query(finalSql, params);
        return result;
    } else {
        return new Promise((resolve, reject) => {
            // Determine if it's a SELECT (returns rows) or INSERT/UPDATE/DELETE
            const trimmed = sql.trim().toUpperCase();
            if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
                sqliteDb.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ rows: rows || [] });
                });
            } else if (trimmed.startsWith('INSERT')) {
                sqliteDb.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ rows: [{ id: this.lastID }], lastID: this.lastID, changes: this.changes });
                });
            } else {
                sqliteDb.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ rows: [], changes: this.changes });
                });
            }
        });
    }
}

// Get a single row
async function queryOne(sql, params = []) {
    const result = await query(sql, params);
    return result.rows[0] || null;
}

// Get all rows
async function queryAll(sql, params = []) {
    const result = await query(sql, params);
    return result.rows;
}

// Execute (INSERT/UPDATE/DELETE) - returns { lastID, changes }
async function execute(sql, params = []) {
    const result = await query(sql, params);
    return { lastID: result.lastID, changes: result.changes || result.rowCount };
}

// Initialize database schema
async function initSchema() {
    const fs = require('fs');
    if (isPostgres) {
        const schema = fs.readFileSync('./database-setup-pg.sql', 'utf8');
        await pool.query(schema);
        logger.info('Schéma PostgreSQL initialisé');
    } else {
        const schema = fs.readFileSync('./database-setup.sql', 'utf8');
        return new Promise((resolve, reject) => {
            sqliteDb.exec(schema, (err) => {
                if (err) reject(err);
                else {
                    logger.info('Schéma SQLite initialisé');
                    resolve();
                }
            });
        });
    }
}

module.exports = {
    query,
    queryOne,
    queryAll,
    execute,
    initSchema,
    isPostgres,
    // Expose raw connections for special cases
    pool,
    sqliteDb
};
