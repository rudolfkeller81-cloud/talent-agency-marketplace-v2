// Test script for forgot password API
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/forgot-password',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
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
        try {
            const result = JSON.parse(data);
            console.log('Response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

// Test with existing email
const testData = JSON.stringify({ email: 'test@example.com' });
req.write(testData);
req.end();
