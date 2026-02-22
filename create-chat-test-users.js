const bcrypt = require('bcrypt');
const DB = require('./db');

async function createChatTestUsers() {
    try {
        console.log('🔧 Creating chat test users...');
        
        // User 1
        const user1Email = 'alice.chat@demo.com';
        const user1Password = 'test123';
        
        const existingUser1 = await DB.queryOne('SELECT id FROM users WHERE email = ?', [user1Email]);
        if (!existingUser1) {
            const passwordHash1 = await bcrypt.hash(user1Password, 10);
            await DB.execute(
                'INSERT INTO users (email, first_name, last_name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
                [user1Email, 'Alice', 'Chat', passwordHash1, 'talent']
            );
            console.log('✅ Created Alice:', user1Email);
        } else {
            console.log('✅ Alice already exists');
        }
        
        // User 2
        const user2Email = 'bob.chat@demo.com';
        const user2Password = 'test123';
        
        const existingUser2 = await DB.queryOne('SELECT id FROM users WHERE email = ?', [user2Email]);
        if (!existingUser2) {
            const passwordHash2 = await bcrypt.hash(user2Password, 10);
            await DB.execute(
                'INSERT INTO users (email, first_name, last_name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
                [user2Email, 'Bob', 'Chat', passwordHash2, 'talent']
            );
            console.log('✅ Created Bob:', user2Email);
        } else {
            console.log('✅ Bob already exists');
        }
        
        // Send a test message between them
        console.log('\n📤 Sending test message...');
        
        // Get user IDs
        const alice = await DB.queryOne('SELECT id FROM users WHERE email = ?', [user1Email]);
        const bob = await DB.queryOne('SELECT id FROM users WHERE email = ?', [user2Email]);
        
        if (alice && bob) {
            // Create simple messages table if needed
            await DB.execute(`
                CREATE TABLE IF NOT EXISTS simple_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id INTEGER NOT NULL,
                    receiver_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Insert test message
            await DB.execute(
                'INSERT INTO simple_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
                [alice.id, bob.id, 'Hey Bob! How are you doing?']
            );
            
            console.log('✅ Test message sent from Alice to Bob');
        }
        
        console.log('\n🎯 Chat Test Users Ready:');
        console.log('Alice:', user1Email, 'password:', user1Password);
        console.log('Bob:', user2Email, 'password:', user2Password);
        
    } catch (error) {
        console.error('❌ Error creating test users:', error);
    }
    
    process.exit(0);
}

createChatTestUsers();
