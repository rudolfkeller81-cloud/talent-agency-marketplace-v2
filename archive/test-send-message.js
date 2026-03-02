const http = require('http');

// First login to get token
const loginData = JSON.stringify({
    email: 'message.test@demo.com',
    password: 'test123'
});

console.log('🔑 Getting token...');

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
                console.log('✅ Got token, testing send message...');
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
        participantId: 1,
        content: 'Test message from API test'
    });

    console.log('📤 Sending message...');

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
