const DB = require('./db');

async function checkUsers() {
    try {
        console.log('🔍 Checking users in database...');
        
        // Check Alice
        const alice = await DB.queryOne('SELECT * FROM users WHERE email = ?', ['alice.chat@demo.com']);
        console.log('Alice:', alice ? {
            id: alice.id,
            email: alice.email,
            firstName: alice.first_name,
            lastName: alice.last_name,
            role: alice.role,
            hasPassword: !!alice.password_hash
        } : 'NOT FOUND');
        
        // Check Bob
        const bob = await DB.queryOne('SELECT * FROM users WHERE email = ?', ['bob.chat@demo.com']);
        console.log('Bob:', bob ? {
            id: bob.id,
            email: bob.email,
            firstName: bob.first_name,
            lastName: bob.last_name,
            role: bob.role,
            hasPassword: !!bob.password_hash
        } : 'NOT FOUND');
        
        // Check all users
        const allUsers = await DB.queryAll('SELECT id, email, first_name, last_name, role FROM users LIMIT 10');
        console.log('\n📋 All users:');
        allUsers.forEach(user => {
            console.log(`- ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`);
        });
        
        // Check messages table
        console.log('\n📨 Checking messages...');
        const messages = await DB.queryAll('SELECT COUNT(*) as count FROM simple_messages');
        console.log('Total messages:', messages[0].count);
        
        if (messages[0].count > 0) {
            const recentMessages = await DB.queryAll('SELECT * FROM simple_messages ORDER BY created_at DESC LIMIT 5');
            console.log('Recent messages:', recentMessages);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

checkUsers();
