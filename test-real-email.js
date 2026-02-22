// Test avec un email qui existe vraiment
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
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log('Response:', JSON.stringify(result, null, 2));
            console.log('\n📧 NOTE: Aucun email n\'est envoyé - c\'est une démo !');
            console.log('🔗 Le reset link est généré dans les logs du serveur');
            console.log('📋 Regarde les logs du serveur pour voir le reset link généré');
        } catch (error) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

// Test avec un email qui existe
const testData = JSON.stringify({ email: 'emma.demo@talent.com' });
req.write(testData);
req.end();
