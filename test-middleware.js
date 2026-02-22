const { getSession } = require('./auth');

async function testMiddleware() {
    try {
        console.log('🔍 Testing middleware simulation...');
        
        const token = 'efa131aa-3488-476b-9cab-f6e567d0753e';
        
        // Simulate middleware logic
        if (!token) {
            console.log('❌ No token');
            return;
        }
        
        console.log('🔍 Token found:', token.substring(0, 20) + '...');
        
        const session = await getSession(token);
        
        if (!session) {
            console.log('❌ Session not found');
            return;
        }
        
        console.log('✅ Session found!');
        console.log('User data:', {
            id: session.user_id,
            email: session.email,
            firstName: session.first_name,
            lastName: session.last_name,
            role: session.role
        });
        
        // Test the exact same query that getSession uses
        console.log('\n🔍 Testing raw query...');
        const DB = require('./db');
        const expireCheck = DB.isPostgres ? 'NOW()' : "datetime('now')";
        const rawSession = await DB.queryOne(
            `SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name, u.role, u.subscription_active, u.plan_type 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.id = ? AND s.expires_at > ${expireCheck}`,
            [token]
        );
        
        console.log('Raw query result:', !!rawSession);
        
        if (rawSession) {
            console.log('Raw session details:', {
                id: rawSession.id,
                userId: rawSession.user_id,
                email: rawSession.email,
                expiresAt: rawSession.expires_at
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
    
    process.exit(0);
}

testMiddleware();
