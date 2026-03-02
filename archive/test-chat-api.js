const http = require('http');

// Test with Alice user
const loginData = JSON.stringify({
    email: 'alice.chat@demo.com',
    password: 'test123'
});

console.log('🔑 Testing login and message sending...');

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
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            if (result.success && result.token) {
                console.log('✅ Login successful!');
                console.log('Token:', result.token.substring(0, 20) + '...');
                
                // Test send message to Bob
                testSendMessage(result.token);
            } else {
                console.log('❌ Login failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Parse error:', error.message);
        }
    });
});

loginReq.on('error', (error) => console.error('❌ Login error:', error.message));
loginReq.write(loginData);
loginReq.end();

function testSendMessage(token) {
    const messageData = JSON.stringify({
        participantId: 23, // Bob's ID
        content: 'Test message from Alice - API test'
    });

    console.log('📤 Testing send message...');

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
        console.log('Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Response:', data);
            
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
