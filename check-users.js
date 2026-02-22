const DB = require('./db');

async function checkUsers() {
    try {
        console.log('🔍 Checking users in database...');
        
        const users = await DB.queryAll('SELECT id, email, first_name, last_name FROM users LIMIT 10');
        console.log('Users found:', users);
        
        if (users.length > 0) {
            console.log('\n🧪 Testing login with first user...');
            const testUser = users[0];
            
            console.log('Testing with:', testUser.email, 'test123');
            
            // Update test script with correct email
            const fs = require('fs');
            let testScript = fs.readFileSync('./test-messages-api.js', 'utf8');
            testScript = testScript.replace('testt@example.com', testUser.email);
            fs.writeFileSync('./test-messages-api.js', testScript);
            console.log('✅ Updated test script with:', testUser.email);
        }
        
    } catch (error) {
        console.error('❌ Error checking users:', error);
    }
    
    process.exit(0);
}

checkUsers();
