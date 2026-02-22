const http = require('http');

const registerData = JSON.stringify({
    firstName: 'Test',
    lastName: 'Register',
    email: 'new.user' + Date.now() + '@demo.com',
    password: 'test123',
    role: 'talent'
});

console.log('🧪 Testing registration...');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerData)
    }
};

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('✅ Registration successful!');
            } else {
                console.log('❌ Registration failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Parse error:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.write(registerData);
req.end();
