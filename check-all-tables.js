const DB = require('./db.js');

async function checkAllTables() {
    try {
        // Get all tables
        const allTables = await DB.query('SELECT name, sql FROM sqlite_master WHERE type="table" ORDER BY name');
        console.log('All tables:');
        allTables.rows.forEach(table => {
            console.log(`\n=== ${table.name} ===`);
            console.log(table.sql);
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAllTables();
