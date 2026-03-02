const DB = require('./db.js');

async function checkOldMessages() {
    try {
        // Get the structure of the old messages table
        const pragma = await DB.query('PRAGMA table_info(messages)');
        console.log('PRAGMA table_info(messages):', pragma);
        
        // Test direct insert
        console.log('Testing INSERT into messages table...');
        try {
            const result = await DB.execute(
                'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
                [29, 32, 'test message']
            );
            console.log('INSERT into messages successful:', result);
        } catch (error) {
            console.error('INSERT into messages failed:', error.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkOldMessages();
