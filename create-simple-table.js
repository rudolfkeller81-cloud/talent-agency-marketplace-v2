const DB = require('./db.js');

async function createSimpleTable() {
    try {
        // Create a simple messages table that works
        console.log('Creating messages_simple table...');
        await DB.execute(`
            CREATE TABLE IF NOT EXISTS messages_simple (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('messages_simple table created successfully');
        
        // Test insert
        console.log('Testing INSERT into messages_simple...');
        const result = await DB.execute(
            'INSERT INTO messages_simple (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [29, 32, 'test message']
        );
        console.log('INSERT successful:', result);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

createSimpleTable();
