const http = require('http');

// Test login first to get token
const loginData = JSON.stringify({
    email: 'test.messages@demo.com',
    password: 'test123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
};

const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Login response:', data);
        
        try {
            const loginResult = JSON.parse(data);
            if (loginResult.success && loginResult.token) {
                console.log('✅ Login successful, testing messages API...');
                
                // Test get messages
                const messagesOptions = {
                    hostname: 'localhost',
                    port: 3001,
                    path: '/api/messages',
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + loginResult.token,
                        'Content-Type': 'application/json'
                    }
                };
                
                const messagesReq = http.request(messagesOptions, (messagesRes) => {
                    let messagesData = '';
                    
                    messagesRes.on('data', (chunk) => {
                        messagesData += chunk;
                    });
                    
                    messagesRes.on('end', () => {
                        console.log('Messages API status:', messagesRes.statusCode);
                        console.log('Messages API response:', messagesData);
                        
                        // Test send message
                        if (messagesRes.statusCode === 200) {
                            console.log('\n🧪 Testing send message...');
                            testSendMessage(loginResult.token);
                        }
                    });
                });
                
                messagesReq.on('error', (error) => {
                    console.error('❌ Messages API error:', error.message);
                });
                
                messagesReq.end();
                
            } else {
                console.log('❌ Login failed');
            }
        } catch (error) {
            console.error('❌ Parse error:', error.message);
        }
    });
});

loginReq.on('error', (error) => {
    console.error('❌ Login error:', error.message);
});

loginReq.write(loginData);
loginReq.end();

// Test send message function
function testSendMessage(token) {
    const messageData = JSON.stringify({
        participantId: 32,
        content: 'Test message from API test'
    });
    
    const sendMessageOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/messages/conversations',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Content-Length': messageData.length
        }
    };
    
    const sendMessageReq = http.request(sendMessageOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Send message status:', res.statusCode);
            console.log('Send message response:', data);
        });
    });
    
    sendMessageReq.on('error', (error) => {
        console.error('❌ Send message error:', error.message);
    });
    
    sendMessageReq.write(messageData);
    sendMessageReq.end();
}
