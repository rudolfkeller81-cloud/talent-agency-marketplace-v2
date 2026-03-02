const DB = require('./db');

async function testDBInAuth() {
    try {
        console.log('🔍 Testing DB access in auth context...');
        
        // Test the exact same query as getUserByEmail
        const user = await DB.queryOne('SELECT * FROM users WHERE email = ?', ['alice.chat@demo.com']);
        
        console.log('DB.queryOne result:', !!user);
        
        if (user) {
            console.log('User found:', {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            });
        }
        
        // Test if we can import and use auth functions
        console.log('\n🔍 Testing auth functions...');
        
        const { getUserByEmail } = require('./auth');
        const authUser = await getUserByEmail('alice.chat@demo.com');
        
        console.log('getUserByEmail result:', !!authUser);
        
        if (authUser) {
            console.log('Auth user found:', {
                id: authUser.id,
                email: authUser.email,
                firstName: authUser.first_name,
                lastName: authUser.last_name
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
    
    process.exit(0);
}

testDBInAuth();
