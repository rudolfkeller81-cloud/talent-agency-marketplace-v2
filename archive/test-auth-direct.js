const { loginUser } = require('./auth');

async function testAuth() {
    try {
        console.log('🔍 Testing auth directly...');
        
        const result = await loginUser('alice.chat@demo.com', 'test123');
        console.log('✅ Login successful!');
        console.log('User:', result.user);
        console.log('Session ID:', result.sessionId);
        
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        console.error('Stack:', error.stack);
    }
    
    process.exit(0);
}

testAuth();
