const http = require('http');

// Test send message without auth
function testSendMessage() {
    const messageData = JSON.stringify({
        participantId: 23, // Bob's ID
        content: 'Test message without auth - ' + new Date().toISOString(),
        senderId: 22 // Alice's ID
    });

    console.log('📤 Testing send message WITHOUT auth...');

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/messages/conversations',
        method: 'POST',
        headers: {
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
                    testGetMessages();
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

function testGetMessages() {
    console.log('\n📥 Testing get messages WITHOUT auth...');
    
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/messages',
        method: 'GET'
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
                        console.log('Latest messages:', result.data.slice(0, 3));
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

testSendMessage();
