const bcrypt = require('bcrypt');
const DB = require('./db');

async function testPasswordVerification() {
    try {
        console.log('🔍 Testing password verification...');
        
        // Get Alice from database
        const alice = await DB.queryOne('SELECT * FROM users WHERE email = ?', ['alice.chat@demo.com']);
        
        if (!alice) {
            console.log('❌ Alice not found');
            return;
        }
        
        console.log('Alice found:', {
            id: alice.id,
            email: alice.email,
            passwordHashLength: alice.password_hash.length,
            passwordHashStart: alice.password_hash.substring(0, 20) + '...'
        });
        
        // Test password verification
        const testPassword = 'test123';
        console.log('\n🔐 Testing password:', testPassword);
        
        const isValid = await bcrypt.compare(testPassword, alice.password_hash);
        console.log('Password valid:', isValid);
        
        // Test with wrong password
        const wrongPassword = 'wrong123';
        console.log('\n❌ Testing wrong password:', wrongPassword);
        const isWrongValid = await bcrypt.compare(wrongPassword, alice.password_hash);
        console.log('Wrong password valid:', isWrongValid);
        
        // Try to hash and compare new password
        console.log('\n🔧 Testing new hash...');
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log('New hash created');
        
        const newHashValid = await bcrypt.compare(testPassword, newHash);
        console.log('New hash valid:', newHashValid);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testPasswordVerification();
