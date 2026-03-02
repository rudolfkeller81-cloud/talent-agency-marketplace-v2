const http = require('http');

// Test with the user from console logs
const loginData = JSON.stringify({
    email: 'rudolf.keller81@gmail.comb',
    password: 'test123'
});

console.log('🔑 Testing with user from console...');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
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
            if (result.success && result.token) {
                console.log('✅ Login successful! Token:', result.token.substring(0, 20) + '...');
                
                // Test send message
                testSendMessage(result.token);
            } else {
                console.log('❌ Login failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Parse error:', error.message);
        }
    });
});

req.on('error', (error) => console.error('❌ Request error:', error.message));
req.write(loginData);
req.end();

function testSendMessage(token) {
    const messageData = JSON.stringify({
        participantId: 37,
        content: 'Test message from browser user'
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
        console.log('Send Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Send Response:', data);
            
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
