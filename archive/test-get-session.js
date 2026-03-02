const { getSession } = require('./auth');

async function testGetSession() {
    try {
        console.log('🔍 Testing getSession...');
        
        const sessionId = 'efa131aa-3488-476b-9cab-f6e567d0753e';
        
        const session = await getSession(sessionId);
        
        console.log('Session result:', !!session);
        
        if (session) {
            console.log('Session details:', {
                id: session.id,
                userId: session.user_id,
                email: session.email,
                firstName: session.first_name,
                lastName: session.last_name,
                role: session.role
            });
            console.log('✅ getSession works!');
        } else {
            console.log('❌ Session not found by getSession');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
    
    process.exit(0);
}

testGetSession();
