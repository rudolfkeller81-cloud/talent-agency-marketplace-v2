const http = require('http');

const loginData = JSON.stringify({
    email: 'test.messages@demo.com',
    password: 'test123'
});

console.log('🧪 Testing simple login...');

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
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        
        try {
            const result = JSON.parse(data);
            if (result.success && result.token) {
                console.log('✅ Login successful! Token:', result.token.substring(0, 20) + '...');
                
                // Test messages API
                testMessagesAPI(result.token);
            } else {
                console.log('❌ Login failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Parse error:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.write(loginData);
req.end();

function testMessagesAPI(token) {
    console.log('\n📨 Testing messages API...');
    
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/messages',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        console.log('Messages API Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Messages API Response:', data);
            
            try {
                const result = JSON.parse(data);
                if (result.success) {
                    console.log('✅ Messages API works! Found', result.data?.length || 0, 'messages');
                    
                    // Test send message
                    testSendMessage(token);
                } else {
                    console.log('❌ Messages API failed:', result.error);
                }
            } catch (error) {
                console.error('❌ Parse error:', error.message);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Messages API error:', error.message);
    });
    
    req.end();
}

function testSendMessage(token) {
    console.log('\n📤 Testing send message...');
    
    const messageData = JSON.stringify({
        participantId: 1,
        content: 'Test message from simple test'
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
        console.log('Send Message Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Send Message Response:', data);
            
            try {
                const result = JSON.parse(data);
                if (result.success) {
                    console.log('✅ Send message works!');
                } else {
                    console.log('❌ Send message failed:', result.error);
                }
            } catch (error) {
                console.error('❌ Parse error:', error.message);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Send message error:', error.message);
    });
    
    req.write(messageData);
    req.end();
}
