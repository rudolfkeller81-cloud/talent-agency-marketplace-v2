const DB = require('./db.js');

async function checkRealStructure() {
    try {
        // Check the actual structure of messages_new table
        const pragma = await DB.query('PRAGMA table_info(messages_new)');
        console.log('PRAGMA table_info(messages_new):', pragma);
        
        // Try to see the actual INSERT that's failing
        console.log('Testing INSERT with explicit columns...');
        try {
            const result = await DB.execute(
                'INSERT INTO messages_new (conversation_id, sender_id, content) VALUES (?, ?, ?)',
                [6, 29, 'test']
            );
            console.log('INSERT successful:', result);
        } catch (error) {
            console.error('INSERT failed:', error.message);
            
            // Try to see what columns are expected
            const tableInfo = await DB.query('PRAGMA table_info(messages_new)');
            console.log('Available columns:', tableInfo.rows.map(col => `${col.name} (${col.notnull ? 'NOT NULL' : 'NULL'})`));
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRealStructure();
