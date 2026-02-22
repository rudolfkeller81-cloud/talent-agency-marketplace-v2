const DB = require('./db.js');

async function checkTriggers() {
    try {
        // Check triggers on messages_new
        const triggers = await DB.query('SELECT sql FROM sqlite_master WHERE type="trigger" AND tbl_name="messages_new"');
        console.log('Triggers on messages_new:', triggers);
        
        // Check all triggers
        const allTriggers = await DB.query('SELECT name, sql, tbl_name FROM sqlite_master WHERE type="trigger"');
        console.log('All triggers:', allTriggers);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTriggers();
