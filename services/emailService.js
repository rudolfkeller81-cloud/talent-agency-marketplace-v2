const sgMail = require('@sendgrid/mail');

// Configuration de SendGrid (tu devras ajouter ta clé API)
sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'TA_CLÉ_API_ICI');

class EmailService {
    static async sendPasswordReset(email, resetLink) {
        const msg = {
            to: email,
            from: {
                email: process.env.FROM_EMAIL || 'noreply@talentagency.com',
                name: process.env.FROM_NAME || 'Talent & Agency'
            },
            subject: 'Reset Your Password - Talent & Agency',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Reset Password</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                        .button:hover { background: #2563eb; }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                        .security { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #22c55e; }
                        .link-box { background: #f0f0f0; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; }
                        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">🎭 Talent & Agency</div>
                            <h1>🔐 Reset Your Password</h1>
                            <p>Secure Password Recovery</p>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>You requested to reset your password for your Talent & Agency account. Click the button below to create a new secure password:</p>
                            
                            <div style="text-align: center;">
                                <a href="${resetLink}" class="button">🔄 Reset Password</a>
                            </div>
                            
                            <p>Or copy and paste this link in your browser:</p>
                            <div class="link-box">${resetLink}</div>
                            
                            <div class="security">
                                <p>🔒 <strong>Security Information:</strong></p>
                                <ul>
                                    <li>This link expires in <strong>1 hour</strong> for your security</li>
                                    <li>If you didn't request this, please ignore this email</li>
                                    <li>Never share this link with anyone</li>
                                    <li>Our team will never ask for your password</li>
                                </ul>
                            </div>
                            
                            <p><strong>Need help?</strong></p>
                            <p>If you have any questions or didn't request this password reset, contact our support team at support@talentagency.com</p>
                            
                            <p>Best regards,<br>
                            The Talent & Agency Team</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2024 Talent & Agency Platform. All rights reserved.</p>
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>Talent & Agency | Connecting Talent with Opportunities</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await sgMail.send(msg);
            console.log('✅ Password reset email sent successfully to:', email);
            return { success: true, message: 'Email sent successfully' };
        } catch (error) {
            console.error('❌ Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    static async testEmail() {
        // Test email pour vérifier que SendGrid fonctionne
        const testLink = 'http://localhost:3001/reset-password?token=test123';
        const result = await this.sendPasswordReset('test@example.com', testLink);
        return result;
    }
}

module.exports = EmailService;
