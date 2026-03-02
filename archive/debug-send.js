const { sendMessage } = require('./auth.js');

async function testSend() {
    try {
        console.log('Testing sendMessage directly...');
        const result = await sendMessage(33, 32, 'Test message from debug');
        console.log('Direct send result:', result);
    } catch (error) {
        console.error('Direct send error:', error);
    }
}

testSend();
