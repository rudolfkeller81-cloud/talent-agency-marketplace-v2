const DB = require('./db.js');

async function checkTable() {
    try {
        // Check all tables that contain 'message'
        const allTables = await DB.query('SELECT name FROM sqlite_master WHERE type="table" AND name LIKE "%message%"');
        console.log('Message-related tables:', allTables);
        
        // Check the actual structure of the messages table
        const actualSchema = await DB.query('SELECT sql FROM sqlite_master WHERE type="table" AND name="messages"');
        console.log('Actual messages table SQL:', actualSchema);
        
        // Check if there's a messages_new table
        try {
            const newTableSchema = await DB.query('SELECT sql FROM sqlite_master WHERE type="table" AND name="messages_new"');
            console.log('Messages_new table SQL:', newTableSchema);
            
            const newMessages = await DB.query('SELECT * FROM messages_new LIMIT 5');
            console.log('Messages_new in table:', newMessages);
        } catch (e) {
            console.log('No messages_new table');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTable();
