const bcrypt = require('bcrypt');
const DB = require('./db');

async function createTestUser() {
    try {
        console.log('🔧 Creating test user...');
        
        const email = 'test.messages@demo.com';
        const password = 'test123';
        const firstName = 'Test';
        const lastName = 'Messages';
        
        // Check if user exists
        const existingUser = await DB.queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            console.log('✅ Test user already exists');
            console.log('Email:', email);
            console.log('Password:', password);
            return;
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert user
        const result = await DB.execute(
            'INSERT INTO users (email, first_name, last_name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [email, firstName, lastName, passwordHash, 'talent']
        );
        
        console.log('✅ Test user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('User ID:', result.lastID);
        
        // Update test script
        const fs = require('fs');
        let testScript = fs.readFileSync('./test-messages-api.js', 'utf8');
        testScript = testScript.replace(/testt@example\.com|emma\.demo@talent\.com/g, email);
        fs.writeFileSync('./test-messages-api.js', testScript);
        console.log('✅ Updated test script with new user');
        
    } catch (error) {
        console.error('❌ Error creating test user:', error);
    }
    
    process.exit(0);
}

createTestUser();
