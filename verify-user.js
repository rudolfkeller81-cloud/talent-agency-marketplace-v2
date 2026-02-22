const DB = require('./db');

async function verifyUser() {
    try {
        console.log('🔍 Verifying test user...');
        
        const email = 'test.messages@demo.com';
        const user = await DB.queryOne('SELECT * FROM users WHERE email = ?', [email]);
        
        if (user) {
            console.log('✅ User found:', {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                has_password_hash: !!user.password_hash
            });
        } else {
            console.log('❌ User not found');
            
            // List all users
            const allUsers = await DB.queryAll('SELECT id, email, first_name FROM users ORDER BY id DESC LIMIT 5');
            console.log('Recent users:', allUsers);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

verifyUser();
