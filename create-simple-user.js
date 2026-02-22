const bcrypt = require('bcrypt');
const DB = require('./db');

async function createSimpleUser() {
    try {
        console.log('🔧 Creating simple test user...');
        
        const email = 'simple@test.com';
        const password = '123456';
        
        // Check if user exists
        const existingUser = await DB.queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            console.log('✅ Simple user already exists');
            console.log('Email:', email);
            console.log('Password:', password);
            return;
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert user
        const result = await DB.execute(
            'INSERT INTO users (email, first_name, last_name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [email, 'Simple', 'Test', passwordHash, 'talent']
        );
        
        console.log('✅ Simple user created!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('User ID:', result.lastID);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

createSimpleUser();
