const http = require('http');

// Test login and message sending with detailed logging
async function testMessages() {
    console.log('🔍 Testing message system...');
    
    // First, check if users exist
    console.log('\n📋 Checking test users...');
    
    // Test login with Alice
    const loginData = JSON.stringify({
        email: 'alice.chat@demo.com',
        password: 'test123'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    const loginReq = http.request(loginOptions, (res) => {
        console.log('Login status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('Login response:', result);
                
                if (result.success && result.token) {
                    console.log('✅ Login successful!');
                    
                    // Test send message
                    testSendMessage(result.token);
                    
                    // Test get messages
                    testGetMessages(result.token);
                } else {
                    console.log('❌ Login failed:', result.error);
                    
                    // Try with Bob instead
                    testWithBob();
                }
            } catch (error) {
                console.error('❌ Parse error:', error.message);
                console.log('Raw response:', data);
            }
        });
    });

    loginReq.on('error', (error) => {
        console.error('❌ Login error:', error.message);
        console.log('Server might not be running');
    });
    
    loginReq.write(loginData);
    loginReq.end();
}

function testWithBob() {
    console.log('\n🔄 Trying with Bob...');
    
    const loginData = JSON.stringify({
        email: 'bob.chat@demo.com',
        password: 'test123'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    const loginReq = http.request(loginOptions, (res) => {
        console.log('Bob login status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('Bob login response:', result);
                
                if (result.success && result.token) {
                    console.log('✅ Bob login successful!');
                    testSendMessage(result.token);
                    testGetMessages(result.token);
                } else {
                    console.log('❌ Bob login failed:', result.error);
                }
            } catch (error) {
                console.error('❌ Parse error:', error.message);
            }
        });
    });

    loginReq.on('error', (error) => console.error('❌ Bob login error:', error.message));
    loginReq.write(loginData);
    loginReq.end();
}

function testSendMessage(token) {
    console.log('\n📤 Testing send message...');
    
    const messageData = JSON.stringify({
        participantId: 23, // Try Bob's ID
        content: 'Test message from debug script - ' + new Date().toISOString()
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/messages/conversations',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(messageData)
        }
    };

    const req = http.request(options, (res) => {
        console.log('Send status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Send response:', data);
            
            try {
                const result = JSON.parse(data);
                if (result.success) {
                    console.log('✅ Message sent successfully!');
                } else {
                    console.log('❌ Send failed:', result.error);
                }
            } catch (error) {
                console.error('❌ Parse error:', error.message);
            }
        });
    });

    req.on('error', (error) => console.error('❌ Send error:', error.message));
    req.write(messageData);
    req.end();
}

function testGetMessages(token) {
    console.log('\n📥 Testing get messages...');
    
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/messages',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    };

    const req = http.request(options, (res) => {
        console.log('Get status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Get response:', data);
            
            try {
                const result = JSON.parse(data);
                if (result.success) {
                    console.log('✅ Messages retrieved!');
                    console.log('Number of messages:', result.data ? result.data.length : 0);
                    if (result.data && result.data.length > 0) {
                        console.log('First message:', result.data[0]);
                    }
                } else {
                    console.log('❌ Get failed:', result.error);
                }
            } catch (error) {
                console.error('❌ Parse error:', error.message);
            }
        });
    });

    req.on('error', (error) => console.error('❌ Get error:', error.message));
    req.end();
}

testMessages();
