const DB = require('./db.js');
const path = require('path');

async function checkDBPath() {
    try {
        console.log('Current working directory:', process.cwd());
        console.log('Database path from DB module:', DB.sqliteDb ? DB.sqliteDb.filename : 'No sqliteDb');
        
        // Check if database file exists
        const fs = require('fs');
        const dbPath = './database.sqlite';
        const exists = fs.existsSync(dbPath);
        console.log('Database file exists:', exists);
        
        if (exists) {
            const stats = fs.statSync(dbPath);
            console.log('Database file size:', stats.size, 'bytes');
            console.log('Database modified:', stats.mtime);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkDBPath();
