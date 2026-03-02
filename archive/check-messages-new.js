const DB = require('./db.js');

async function checkMessagesNew() {
    try {
        // Get the actual CREATE SQL for messages_new
        const createSQL = await DB.query('SELECT sql FROM sqlite_master WHERE type="table" AND name="messages_new"');
        console.log('Messages_new CREATE SQL:', createSQL);
        
        // Get table info
        const tableInfo = await DB.query('PRAGMA table_info(messages_new)');
        console.log('Messages_new table info:', tableInfo);
        
        // Try to insert a test message manually
        console.log('Testing manual insert...');
        try {
            // First create a conversation
            const convResult = await DB.execute(
                'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
                [33, 32]
            );
            console.log('Conversation created:', convResult);
            
            // Then try to insert message
            const msgResult = await DB.execute(
                'INSERT INTO messages_new (conversation_id, sender_id, content) VALUES (?, ?, ?)',
                [convResult.lastID, 33, 'Test message']
            );
            console.log('Message inserted:', msgResult);
        } catch (error) {
            console.error('Manual insert failed:', error);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkMessagesNew();
