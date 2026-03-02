// Test simple de l'API messages
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/messages',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log('Messages API Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
