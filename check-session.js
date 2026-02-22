const DB = require('./db');

async function checkSession() {
    try {
        console.log('🔍 Checking session...');
        
        const sessionId = 'efa131aa-3488-476b-9cab-f6e567d0753e';
        
        // Check if session exists
        const session = await DB.queryOne(
            `SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name, u.role, u.subscription_active, u.plan_type 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.id = ?`,
            [sessionId]
        );
        
        console.log('Session found:', !!session);
        
        if (session) {
            console.log('Session details:', {
                id: session.id,
                userId: session.user_id,
                email: session.email,
                expiresAt: session.expires_at,
                createdAt: session.created_at
            });
            
            // Check if expired
            const now = new Date();
            const expiresAt = new Date(session.expires_at);
            console.log('Current time:', now.toISOString());
            console.log('Expires at:', expiresAt.toISOString());
            console.log('Is expired:', now > expiresAt);
        } else {
            console.log('❌ Session not found in database');
            
            // Check all sessions
            const allSessions = await DB.queryAll('SELECT * FROM sessions LIMIT 10');
            console.log('All sessions:', allSessions.length);
            allSessions.forEach(s => {
                console.log(`- ${s.id} (user ${s.user_id}) expires: ${s.expires_at}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

checkSession();
