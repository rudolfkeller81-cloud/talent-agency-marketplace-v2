# 📧 Guide de Configuration SendGrid

## 🎯 Objectif
Configurer SendGrid pour envoyer des emails de réinitialisation de mot de passe dans votre application Talent & Agency.

## 📋 Prérequis
- Compte SendGrid (gratuit pour 100 emails/jour)
- Node.js et npm installés
- Clé API SendGrid

## 🔧 Étape 1: Créer un compte SendGrid

1. **Inscription gratuite**
   - Allez sur [sendgrid.com](https://sendgrid.com)
   - Créez un compte gratuit (100 emails/jour)
   - Vérifiez votre email

2. **Créer une clé API**
   - Connectez-vous à votre dashboard SendGrid
   - Allez dans **Settings** → **API Keys**
   - Cliquez sur **Create API Key**
   - Nommez-la "TalentAgency App"
   - Cochez les permissions:
     - ✅ **Mail Send** (envoyer des emails)
     - ✅ **API Access** (accès API)
   - Copiez la clé API et gardez-la en sécurité

## 🔧 Étape 2: Installer le SDK SendGrid

```bash
npm install @sendgrid/mail
```

## 🔧 Étape 3: Configuration des variables d'environnement

Créez un fichier `.env` à la racine de votre projet:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.votre_cle_api_ici
FROM_EMAIL=noreply@votredomaine.com
FROM_NAME=Talent & Agency
```

## 🔧 Étape 4: Créer le service d'envoi d'emails

Créez le fichier `services/emailService.js`:

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
    static async sendPasswordReset(email, resetLink) {
        const msg = {
            to: email,
            from: {
                email: process.env.FROM_EMAIL,
                name: process.env.FROM_NAME
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
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                        .security { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Reset Your Password</h1>
                            <p>Talent & Agency Platform</p>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>You requested to reset your password. Click the button below to create a new password:</p>
                            <div style="text-align: center;">
                                <a href="${resetLink}" class="button">Reset Password</a>
                            </div>
                            <p>Or copy and paste this link in your browser:</p>
                            <p style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">${resetLink}</p>
                            
                            <div class="security">
                                <p>🔒 <strong>Security Notice:</strong></p>
                                <ul>
                                    <li>This link expires in 1 hour</li>
                                    <li>If you didn't request this, ignore this email</li>
                                    <li>Never share this link with anyone</li>
                                </ul>
                            </div>
                            
                            <p>If you have any questions, contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2024 Talent & Agency. All rights reserved.</p>
                            <p>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await sgMail.send(msg);
            console.log('✅ Password reset email sent to:', email);
            return { success: true };
        } catch (error) {
            console.error('❌ Error sending email:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = EmailService;
```

## 🔧 Étape 5: Intégrer dans votre API forgot-password

Modifiez votre endpoint `/api/forgot-password` dans `server.js`:

```javascript
const EmailService = require('./services/emailService');

// Dans votre forgot password endpoint, remplacez:
// console.log('🔗 Reset link generated:', resetLink);

// Par:
try {
    const emailResult = await EmailService.sendPasswordReset(email, resetLink);
    if (emailResult.success) {
        console.log('✅ Email sent successfully');
    } else {
        console.log('❌ Email failed:', emailResult.error);
    }
} catch (error) {
    console.error('❌ Email service error:', error);
}
```

## 🔧 Étape 6: Configuration du domaine (Production)

Pour la production, vous devrez:

1. **Configurer votre domaine**
   - Dans SendGrid Dashboard → **Settings** → **Sender Authentication**
   - Ajoutez votre domaine (ex: votredomaine.com)
   - Configurez les enregistrements DNS:
     ```
     TXT: "v=spf1 include:sendgrid.net ~all"
     TXT: "v=DKIM1; k=rsa; p=..." (fourni par SendGrid)
     CNAME: "mail._domainkey.votredomaine.com" → "dkim.sendgrid.net"
     ```

2. **Vérifier le domaine**
   - Attendez la propagation DNS (peut prendre 24-48h)
   - Vérifiez dans SendGrid Dashboard

## 🔧 Étape 7: Tester l'envoi d'emails

Créez un fichier de test `test-email.js`:

```javascript
const EmailService = require('./services/emailService');

async function testEmail() {
    const result = await EmailService.sendPasswordReset(
        'test@example.com',
        'http://localhost:3001/reset-password?token=test123'
    );
    
    console.log('Email result:', result);
}

testEmail();
```

Lancez le test:
```bash
node test-email.js
```

## 📊 Monitoring et Limites

### Plan Gratuit SendGrid
- **100 emails/jour**
- **2 000 emails/mois**
- **Pas de branding SendGrid**
- **Support communautaire**

### Monitoring
- Dashboard SendGrid → **Email Activity**
- Statistiques en temps réel
- Bounce et complaint tracking

## 🚀 Déploiement

### Variables d'environnement en production
```bash
# Render / Heroku / Vercel
SENDGRID_API_KEY=sg_live_...
FROM_EMAIL=noreply@votredomaine.com
FROM_NAME=Talent & Agency
```

### Sécurité
- Ne jamais exposer la clé API dans le code client
- Utiliser des variables d'environnement
- Limiter les tentatives d'envoi
- Valider les emails avant envoi

## 🔧 Étape 8: Alternatives (si SendGrid ne convient pas)

### Options alternatives:
1. **Nodemailer** (SMTP gratuit)
2. **Mailgun** (10 000 emails/mois gratuits)
3. **Amazon SES** (pay-as-you-go)
4. **Resend** (API moderne, 3 000 emails/mois gratuits)

### Exemple avec Nodemailer:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
});
```

## ✅ Checklist finale

- [ ] Compte SendGrid créé
- [ ] Clé API générée
- [ ] SDK SendGrid installé
- [ ] Variables d'environnement configurées
- [ ] Service d'email créé
- [ ] API intégré
- [ ] Email de test envoyé
- [ ] Domaine configuré (production)
- [ ] Monitoring activé

## 🆘 Support

- **Documentation SendGrid**: https://sendgrid.com/docs
- **Support communautaire**: https://sendgrid.com/support
- **Status page**: https://status.sendgrid.com

---

🎉 **Félicitations !** Votre système d'envoi d'emails est maintenant configuré et prêt à être utilisé pour la réinitialisation de mots de passe !
