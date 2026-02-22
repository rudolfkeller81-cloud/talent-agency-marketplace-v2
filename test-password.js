const bcrypt = require('bcrypt');
const DB = require('./db');

async function testPassword() {
    try {
        console.log('🔍 Testing password verification...');
        
        const email = 'test.messages@demo.com';
        const password = 'test123';
        
        const user = await DB.queryOne('SELECT password_hash FROM users WHERE email = ?', [email]);
        
        if (user) {
            console.log('✅ User found, testing password...');
            
            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log('Password valid:', isValid);
            
            if (isValid) {
                console.log('✅ Password verification works!');
                
                // Test login function directly
                const { loginUser } = require('./auth.js');
                try {
                    const loginResult = await loginUser(email, password);
                    console.log('✅ Login function works:', loginResult.user.email);
                } catch (error) {
                    console.error('❌ Login function error:', error.message);
                }
            } else {
                console.log('❌ Password verification failed');
            }
        } else {
            console.log('❌ User not found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testPassword();
