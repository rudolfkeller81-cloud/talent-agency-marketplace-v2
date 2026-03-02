// Script de test pour SendGrid
const EmailService = require('./services/emailService');

async function testSendGrid() {
    console.log('🧪 Testing SendGrid email service...');
    
    // Test avec un email de démonstration
    const testEmail = 'test@example.com';
    const testLink = 'http://localhost:3001/reset-password?token=test123456789';
    
    console.log('📧 Sending test email to:', testEmail);
    console.log('🔗 Test reset link:', testLink);
    
    try {
        const result = await EmailService.sendPasswordReset(testEmail, testLink);
        
        if (result.success) {
            console.log('✅ SUCCESS: Email sent successfully!');
            console.log('📊 Check your SendGrid dashboard for delivery status');
        } else {
            console.log('❌ FAILED: Email not sent');
            console.log('🔍 Error:', result.error);
            console.log('');
            console.log('🔧 TROUBLESHOOTING:');
            console.log('1. Check if SENDGRID_API_KEY is set in .env file');
            console.log('2. Verify your API key is correct');
            console.log('3. Check if sender identity is verified in SendGrid');
            console.log('4. Make sure @sendgrid/mail is installed');
        }
    } catch (error) {
        console.log('❌ CRITICAL ERROR:', error.message);
        console.log('');
        console.log('🔧 QUICK FIX:');
        console.log('1. Set your SendGrid API key: SET SENDGRID_API_KEY=SG.your_key_here');
        console.log('2. Or create .env file with: SENDGRID_API_KEY=SG.your_key_here');
    }
}

// Instructions pour l'utilisateur
console.log('📋 SENDGRID SETUP CHECKLIST:');
console.log('');
console.log('✅ 1. SendGrid account created');
console.log('✅ 2. API key generated');
console.log('✅ 3. @sendgrid/mail installed');
console.log('✅ 4. Email service created');
console.log('✅ 5. Server updated');
console.log('');
console.log('🔧 NEXT STEPS:');
console.log('1. Set your API key: SET SENDGRID_API_KEY=SG.your_actual_key');
console.log('2. Run this test: node test-sendgrid.js');
console.log('3. Check email delivery in SendGrid dashboard');
console.log('');

// Lancer le test
testSendGrid();
