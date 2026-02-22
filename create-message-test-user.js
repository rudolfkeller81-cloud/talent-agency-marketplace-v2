const bcrypt = require('bcrypt');
const DB = require('./db');

async function createMessageTestUser() {
    try {
        console.log('🔧 Creating message test user...');
        
        const email = 'message.test@demo.com';
        const password = 'test123';
        const firstName = 'Message';
        const lastName = 'Test';
        
        // Check if user exists
        const existingUser = await DB.queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            console.log('✅ Message test user already exists');
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
        
        console.log('✅ Message test user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('User ID:', result.lastID);
        
    } catch (error) {
        console.error('❌ Error creating test user:', error);
    }
    
    process.exit(0);
}

createMessageTestUser();
