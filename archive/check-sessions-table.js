const DB = require('./db');

async function checkSessionsTable() {
    try {
        console.log('🔍 Checking sessions table...');
        
        // Check if table exists
        const tables = await DB.queryAll(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='sessions'
        `);
        
        if (tables.length === 0) {
            console.log('❌ Sessions table does not exist');
            
            // Create it
            console.log('🔧 Creating sessions table...');
            await DB.execute(`
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `);
            console.log('✅ Sessions table created');
        } else {
            console.log('✅ Sessions table exists');
            
            // Check structure
            try {
                const schema = await DB.queryAll(`PRAGMA table_info(sessions)`);
                console.log('Table schema:', schema);
                
                // Try to insert a test session
                console.log('🧪 Testing session insertion...');
                const testSessionId = 'test-session-' + Date.now();
                await DB.execute(
                    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
                    [testSessionId, 1, new Date(Date.now() + 86400000).toISOString()]
                );
                console.log('✅ Session insertion works');
                
                // Clean up
                await DB.execute('DELETE FROM sessions WHERE id = ?', [testSessionId]);
                console.log('✅ Test session cleaned up');
                
            } catch (schemaError) {
                console.error('❌ Schema/insert error:', schemaError);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

checkSessionsTable();
