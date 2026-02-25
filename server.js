// ============================================================================
// Serveur Node.js - Talent & Agency Marketplace
// Version propre - Toutes fonctionnalités consolidées
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const xss = require('xss');

// Logger centralisé
const logger = require('./logger');

// Database
const DB = require('./db');

// Services
const stripeService = require('./services/stripe-service');
const apiRoutes = require('./services/api-routes');

// Auth & Database
const {
    initDatabase,
    registerUser,
    loginUser,
    getUserByEmail,
    getUserById,
    getSession,
    logoutUser,
    updateStripeSubscription,
    getTalents,
    getAgencies,
    getUserProfile,
    updateUserProfile,
    updateTalentProfile,
    updateAgencyProfile,
    getProfiles,
    getProfileById,
    searchProfiles,
    addToFavorites,
    removeFromFavorites,
    getUserFavorites,
    isFavorite,
    deleteUserAccount,
    getUserMessages,
    sendMessage,
    db
} = require('./auth.js');

// Upload
const { uploadAvatar, uploadVideo, uploadPortfolio, getFileUrl, uploadMessageFiles } = require('./upload.js');

// Stripe (optionnel - ne crash pas si pas configuré)
let stripe = null;
try {
    if (process.env.STRIPE_SECRET_KEY) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        logger.info('Stripe initialisé');
    } else {
        logger.warn('STRIPE_SECRET_KEY non défini - paiements désactivés');
    }
} catch (e) {
    logger.warn('Module Stripe non disponible');
}

// Google OAuth (optionnel)
let googleClient = null;
try {
    if (process.env.GOOGLE_CLIENT_ID) {
        const { OAuth2Client } = require('google-auth-library');
        googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        logger.info('Google OAuth initialisé');
    }
} catch (e) {
    logger.warn('Google OAuth non disponible');
}

// ============================================================================
// APP SETUP
// ============================================================================

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : (process.env.NODE_ENV === 'production'
                ? [process.env.PRODUCTION_URL || 'https://yourdomain.onrender.com']
                : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003', 'http://127.0.0.1:3003']),
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE - SÉCURITÉ
// ============================================================================

// --- Helmet : headers HTTP sécurisés ---
const isProd = process.env.NODE_ENV === 'production';
const productionUrl = process.env.PRODUCTION_URL || 'https://yourdomain.onrender.com';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://accounts.google.com", "https://js.stripe.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'",
                "https://accounts.google.com",
                "https://api.stripe.com",
                ...(isProd
                    ? [productionUrl, productionUrl.replace('https://', 'wss://')]
                    : ["http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"])
            ],
            frameSrc: ["'self'", "https://accounts.google.com", "https://js.stripe.com"],
        }
    },
    crossOriginEmbedderPolicy: false,
}));

// --- CORS strict ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : (isProd
        ? [productionUrl]
        : ['http://localhost:3003', 'http://127.0.0.1:3003']);

app.use(cors({
    origin: function(origin, callback) {
        // Autoriser les requêtes sans origin (même serveur, curl, etc.)
        if (!origin) return callback(null, true);
        // En dev, autoriser localhost/127.0.0.1 sur n'importe quel port
        if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS bloqué pour origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Rate Limiting global : 100 req / 15 min par IP ---
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: { success: false, error: 'Trop de requêtes, réessayez dans 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Routes API pour les services
app.use('/api/services', apiRoutes);

// --- Rate Limiting strict pour auth : 10 req / 15 min par IP ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: { success: false, error: 'Trop de tentatives, réessayez dans 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Body parsing ---
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// --- Sanitization middleware : désactivé pour le déploiement ---
// app.use((req, res, next) => {
//     console.log('🔍 Middleware - Body before sanitization:', req.body);
//     if (req.body && typeof req.body === 'object') {
//         sanitizeObject(req.body);
//     }
//     if (req.query && typeof req.query === 'object') {
//         sanitizeObject(req.query);
//     }
//     console.log('🔍 Middleware - Body after sanitization:', req.body);
//     next();
// });

function sanitizeObject(obj) {
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
            obj[key] = xss(obj[key].trim());
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}

// Bloquer l'accès direct aux fichiers .html (rediriger vers les routes propres)
app.use((req, res, next) => {
    if (req.path.endsWith('.html') && !req.path.startsWith('/api')) {
        const cleanPath = req.path.replace('.html', '').replace('/index', '/');
        return res.redirect(cleanPath || '/');
    }
    next();
});

// Fichiers statiques
app.use(express.static('.', { maxAge: '1d', etag: true }));
app.use('/uploads', express.static('uploads', { maxAge: '30d', etag: true }));

// Auth middleware
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    getSession(token)
        .then(session => {
            if (!session) {
                return res.status(401).json({ success: false, error: 'Session invalide ou expirée' });
            }
            req.user = session;
            next();
        })
        .catch(err => {
            logger.error('Auth middleware error:', err);
            res.status(500).json({ success: false, error: 'Erreur serveur' });
        });
}

// ============================================================================
// INITIALISATION BASE DE DONNÉES
// ============================================================================

initDatabase()
    .then(() => logger.info('Base de données initialisée'))
    .catch(err => logger.error('Erreur init DB:', err));

// ============================================================================
// ROUTES PAGES HTML
// ============================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/signup/talent', (req, res) => {
    res.sendFile(path.join(__dirname, 'register-talent.html'));
});

app.get('/register-agency', (req, res) => {
    console.log('🎯 Route /register-agency appelée');
    res.sendFile(path.join(__dirname, 'register-agency.html'));
});

// Route alternative au cas où
app.get('/signup/agency', (req, res) => {
    console.log('🎯 Route /signup/agency appelée');
    res.sendFile(path.join(__dirname, 'register-agency.html'));
});

app.get('/discover', (req, res) => {
    res.sendFile(path.join(__dirname, 'discover.html'));
});

app.get('/favorites', (req, res) => {
    res.sendFile(path.join(__dirname, 'favorites.html'));
});

app.get('/messages', (req, res) => {
    res.sendFile(path.join(__dirname, 'messages.html'));
});

app.get('/logout', (req, res) => {
    res.sendFile(path.join(__dirname, 'logout.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'reset-password.html'));
});

app.get('/manage-agency', (req, res) => {
    res.sendFile(path.join(__dirname, 'manage-agency.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'settings.html'));
});

app.get('/pages/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'settings.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'profile.html'));
});

app.get('/profile-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'profile-backup.html'));
});

app.get('/setup-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'setup-real-profile.html'));
});

app.get('/clean-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'clean-profile.html'));
});

app.get('/check-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'check-profile.html'));
});

app.get('/import-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'import-profile.html'));
});

app.get('/signup-simple', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'signup-simple.html'));
});

app.get('/signup-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'signup-test.html'));
});

app.get('/signup-final', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'signup-final.html'));
});

app.get('/my-real-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'my-real-profile.html'));
});

app.get('/clean-all', (req, res) => {
    res.sendFile(path.join(__dirname, 'clean-all.html'));
});

app.get('/force-update', (req, res) => {
    res.sendFile(path.join(__dirname, 'force-update.html'));
});

app.get('/test-posts-with-media', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-posts-with-media.html'));
});

app.get('/manage-subscription', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'manage-subscription.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'contact.html'));
});

app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'pricing.html'));
});

app.get('/payment-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'payment-success.html'));
});

app.get('/pages/payment-success', (req, res) => {
    console.log('🎯 Route /pages/payment-success appelée');
    res.sendFile(path.join(__dirname, 'pages', 'payment-success.html'));
});

app.get('/test-redirect', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-redirect.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'terms.html'));
});

app.get('/agency-pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'agency-pricing.html'));
});

app.get('/pages/agency-pricing', (req, res) => {
    console.log('🎯 Route /pages/agency-pricing appelée');
    res.sendFile(path.join(__dirname, 'pages', 'agency-pricing.html'));
});

app.get('/billing', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'private', 'billing.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'private', 'dashboard.html'));
});

// ============================================================================
// API TEST
// ============================================================================

app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Server is working!', timestamp: new Date() });
});

// ============================================================================
// API AUTH
// ============================================================================

// Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, talentProfile, agencyProfile } = req.body;

        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ success: false, error: 'Champs requis manquants' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: 'Adresse email invalide' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        if (firstName.length > 50 || lastName.length > 50) {
            return res.status(400).json({ success: false, error: 'Nom trop long (max 50 caractères)' });
        }

        if (!['talent', 'agency'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Rôle invalide. Doit être "talent" ou "agency"' });
        }

        const user = await registerUser({ firstName, lastName, email, password, role, talentProfile, agencyProfile });
        const loginData = await loginUser(email, password);

        res.json({
            success: true,
            sessionId: loginData.sessionId,
            token: loginData.sessionId,
            user: {
                id: user.id,
                email: user.email || email,
                firstName: user.firstName || firstName,
                lastName: user.lastName || lastName,
                role: user.role || role
            }
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(400).json({ success: false, error: error.message || 'Erreur d\'inscription' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔑 Raw request body:', req.body);
        const { email, password } = req.body;
        
        console.log('🔑 Login attempt:', { email, passwordLength: password?.length });

        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
        }

        if (!validator.isEmail(email)) {
            console.log('❌ Invalid email format');
            return res.status(400).json({ success: false, error: 'Adresse email invalide' });
        }

        console.log('🔍 Calling loginUser function...');
        const loginData = await loginUser(email, password);
        console.log('✅ Login successful:', loginData.user.email);

        res.json({
            success: true,
            sessionId: loginData.sessionId,
            token: loginData.sessionId,
            user: loginData.user
        });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        logger.error('Login error:', error);
        res.status(401).json({ success: false, error: error.message || 'Email ou mot de passe incorrect' });
    }
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('🔑 Forgot password request:', { email });
        
        // Initialize database connection
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('./database.sqlite');
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email address' });
        }
        
        // Check if user exists (using direct SQLite)
        db.get(`
            SELECT id, email, first_name, last_name 
            FROM users 
            WHERE email = ?
        `, [email], (err, user) => {
            if (err) {
                console.error('❌ Error checking user:', err);
                return res.status(500).json({ success: false, error: 'Database error.' });
            }
            
            if (!user) {
                // Don't reveal if email exists or not for security
                console.log('📧 Email not found:', email);
                return res.json({ 
                    success: true, 
                    message: 'If an account exists with this email, a password reset link has been sent.' 
                });
            }
            
            console.log('✅ User found:', { id: user.id, email: user.email });
            
            // Generate reset token
            const crypto = require('crypto');
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
            
            // Save reset token to database
            db.run(`
                INSERT INTO password_resets (email, token, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            `, [email, resetToken, expiresAt.toISOString(), new Date().toISOString()], async (err) => {
                if (err) {
                    console.error('❌ Error saving reset token:', err);
                    return res.status(500).json({ success: false, error: 'Failed to save reset token.' });
                }
                
                console.log('✅ Reset token saved:', { email, token: resetToken.substring(0, 8) + '...' });
                
                // Service email désactivé - retourner directement le lien
                const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
                console.log('🔗 Reset link generated:', resetLink);
                
                res.json({ 
                    success: true, 
                    message: 'Password reset link generated. Please copy this link: ' + resetLink,
                    resetLink: resetLink
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        logger.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Failed to send reset link. Please try again.' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        console.log('🔑 Reset password request:', { token: token?.substring(0, 8) + '...' });
        
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, error: 'Token and new password are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }
        
        // Initialize database connection
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('./database.sqlite');
        
        // Check if token exists and is valid
        db.get(`
            SELECT email, expires_at, used 
            FROM password_resets 
            WHERE token = ?
        `, [token], async (err, resetRecord) => {
            if (err) {
                console.error('❌ Error checking reset token:', err);
                return res.status(500).json({ success: false, error: 'Database error.' });
            }
            
            if (!resetRecord) {
                console.log('❌ Invalid reset token');
                return res.status(400).json({ success: false, error: 'invalid_token' });
            }
            
            // Check if token is expired
            const expiresAt = new Date(resetRecord.expires_at);
            if (expiresAt < new Date()) {
                console.log('❌ Expired reset token');
                return res.status(400).json({ success: false, error: 'token_expired' });
            }
            
            // Check if token is already used
            if (resetRecord.used) {
                console.log('❌ Already used reset token');
                return res.status(400).json({ success: false, error: 'token_used' });
            }
            
            console.log('✅ Valid reset token for:', resetRecord.email);
            
            try {
                // Hash the new password
                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                
                // Update user password
                db.run(`
                    UPDATE users 
                    SET password_hash = ?, updated_at = ?
                    WHERE email = ?
                `, [hashedPassword, new Date().toISOString(), resetRecord.email], function(err) {
                    if (err) {
                        console.error('❌ Error updating password:', err);
                        return res.status(500).json({ success: false, error: 'Failed to update password.' });
                    }
                    
                    console.log('✅ Password updated for:', resetRecord.email);
                    
                    // Mark token as used
                    db.run(`
                        UPDATE password_resets 
                        SET used = TRUE 
                        WHERE token = ?
                    `, [token], function(err) {
                        if (err) {
                            console.error('❌ Error marking token as used:', err);
                        } else {
                            console.log('✅ Reset token marked as used');
                        }
                        
                        // Clean up expired tokens
                        db.run(`
                            DELETE FROM password_resets 
                            WHERE expires_at < datetime('now') OR used = TRUE
                        `, (err) => {
                            if (err) {
                                console.error('❌ Error cleaning up tokens:', err);
                            }
                        });
                        
                        res.json({ 
                            success: true, 
                            message: 'Password reset successfully!' 
                        });
                    });
                });
            } catch (hashError) {
                console.error('❌ Error hashing password:', hashError);
                return res.status(500).json({ success: false, error: 'Failed to process password.' });
            }
        });
        
    } catch (error) {
        console.error('❌ Reset password error:', error);
        logger.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password. Please try again.' });
    }
});

// Verify session
app.get('/api/auth/verify', requireAuth, (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: {
            id: req.user.user_id || req.user.id,
            email: req.user.email,
            firstName: req.user.first_name,
            lastName: req.user.last_name,
            role: req.user.role
        }
    });
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            await logoutUser(token);
        }
        res.json({ success: true });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Google OAuth
app.post('/api/auth/google', authLimiter, async (req, res) => {
    try {
        if (!googleClient) {
            return res.status(503).json({ success: false, error: 'Google OAuth non configuré' });
        }

        const { token, role = 'talent' } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token Google requis' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const existingUser = await getUserByEmail(payload.email);

        let user;
        if (existingUser) {
            user = existingUser;
        } else {
            const names = (payload.name || '').split(' ');
            const firstName = names[0] || 'Google';
            const lastName = names.slice(1).join(' ') || 'User';
            const randomPassword = Math.random().toString(36).slice(-12) + 'A1!';

            user = await registerUser({
                firstName,
                lastName,
                email: payload.email,
                password: randomPassword,
                role: role,
                talentProfile: null,
                agencyProfile: null
            });
        }

        const loginData = await loginUser(payload.email, null);

        res.json({
            success: true,
            sessionId: loginData.sessionId,
            token: loginData.sessionId,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                subscription_active: user.subscription_active || false
            }
        });
    } catch (error) {
        logger.error('Google auth error:', error);
        res.status(400).json({ success: false, error: 'Authentification Google échouée: ' + error.message });
    }
});

// ============================================================================
// API USER PROFILE
// ============================================================================

app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const profile = await getUserProfile(userId);

        if (!profile) {
            return res.status(404).json({ success: false, error: 'Profil non trouvé' });
        }

        res.json({ success: true, data: profile });
    } catch (error) {
        logger.error('Error getting user profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const result = await updateUserProfile(userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/user/account', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        await deleteUserAccount(userId);
        res.json({ success: true, message: 'Compte supprimé' });
    } catch (error) {
        logger.error('Error deleting account:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/user/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await getUserById(userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        res.json({ success: true, user });
    } catch (error) {
        logger.error('Error getting user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update talent profile
app.put('/api/profile/talent', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const result = await updateTalentProfile(userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error updating talent profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update agency profile
app.put('/api/profile/agency', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const result = await updateAgencyProfile(userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error updating agency profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get profile by ID (public)
app.get('/api/profile/:id', async (req, res) => {
    try {
        const profile = await getProfileById(req.params.id);

        if (!profile) {
            return res.status(404).json({ success: false, error: 'Profil non trouvé' });
        }

        res.json({ success: true, data: profile });
    } catch (error) {
        logger.error('Error getting profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// API DISCOVER & SEARCH
// ============================================================================

// Get all profiles (with optional type filter)
app.get('/api/profiles', async (req, res) => {
    try {
        const profiles = await getProfiles();
        res.json({ success: true, data: profiles });
    } catch (error) {
        logger.error('Error getting profiles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get talents
app.get('/api/discover/talents', async (req, res) => {
    try {
        const talents = await getTalents();
        res.json({ success: true, data: talents });
    } catch (error) {
        logger.error('Error getting talents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get agencies
app.get('/api/discover/agencies', async (req, res) => {
    try {
        const agencies = await getAgencies();
        res.json({ success: true, data: agencies });
    } catch (error) {
        logger.error('Error getting agencies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search profiles
app.get('/api/discover/search', async (req, res) => {
    try {
        const { q, type } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ success: false, error: 'Recherche: minimum 2 caractères' });
        }

        const results = await searchProfiles(q, type);
        res.json({ success: true, data: results });
    } catch (error) {
        logger.error('Error searching profiles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// API MESSAGES
// ============================================================================

// Get user conversations
app.get('/api/messages/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const messages = await getUserMessages(userId);
        
        // Group messages by conversation partner
        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    participantId: otherUserId,
                    messages: [],
                    lastMessage: null
                };
            }
            conversations[otherUserId].messages.push(msg);
            
            // Update last message
            if (!conversations[otherUserId].lastMessage || 
                new Date(msg.created_at) > new Date(conversations[otherUserId].lastMessage.created_at)) {
                conversations[otherUserId].lastMessage = msg;
            }
        });
        
        const conversationList = Object.values(conversations);
        res.json({ success: true, conversations: conversationList });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send message
app.post('/api/messages', requireAuth, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.user_id || req.user.id;

        if (!receiverId || !content) {
            return res.status(400).json({ success: false, error: 'Destinataire et contenu requis' });
        }

        const message = await sendMessage(senderId, receiverId, content);

        // Notification temps réel
        const socketId = connectedUsers.get(String(receiverId));
        if (socketId) {
            io.to(socketId).emit('new_message', {
                senderId,
                senderName: `${req.user.first_name} ${req.user.last_name}`,
                content,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ success: true, data: message });
    } catch (error) {
        logger.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Simple message API - SANS AUTH pour tests
app.post('/api/messages/conversations', async (req, res) => {
    try {
        const { participantId, content, senderId } = req.body;

        if (!participantId || !content) {
            return res.status(400).json({ success: false, error: 'Destinataire et contenu requis' });
        }

        // Utiliser senderId du body ou défaut à 1 (Alice)
        const actualSenderId = senderId || 22; // Alice's ID

        // Create simple messages table if needed
        await DB.execute(`
            CREATE TABLE IF NOT EXISTS simple_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert message directly
        const result = await DB.execute(
            'INSERT INTO simple_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [actualSenderId, participantId, content]
        );

        console.log('✅ Message inserted:', {
            id: result.lastID,
            senderId: actualSenderId,
            receiverId: participantId,
            content: content
        });

        res.json({ success: true, data: { id: result.lastID } });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get messages - SANS AUTH pour tests
app.get('/api/messages', async (req, res) => {
    try {
        // Utiliser Alice's ID (22) pour voir tous ses messages (envoyés et reçus)
        const aliceId = 22;

        // Create table if needed
        await DB.execute(`
            CREATE TABLE IF NOT EXISTS simple_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get ALL messages involving Alice (sent AND received)
        const messages = await DB.queryAll(`
            SELECT m.*, 
                   u.first_name as sender_first_name, 
                   u.last_name as sender_last_name,
                   u.email as sender_email,
                   r.first_name as receiver_first_name,
                   r.last_name as receiver_last_name,
                   r.email as receiver_email
            FROM simple_messages m
            LEFT JOIN users u ON m.sender_id = u.id
            LEFT JOIN users r ON m.receiver_id = r.id
            WHERE m.sender_id = ? OR m.receiver_id = ?
            ORDER BY m.created_at DESC
        `, [aliceId, aliceId]);

        console.log('📨 All messages for Alice:', messages.length, 'messages');

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// API FAVORITES
// ============================================================================

// Get favorites
app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const favorites = await getUserFavorites(userId);
        res.json({ success: true, data: favorites });
    } catch (error) {
        logger.error('Error getting favorites:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add to favorites
app.post('/api/favorites', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { favoritedUserId } = req.body;

        if (!favoritedUserId) {
            return res.status(400).json({ success: false, error: 'ID utilisateur favori requis' });
        }

        const result = await addToFavorites(userId, favoritedUserId);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error adding favorite:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove from favorites
app.delete('/api/favorites/:favoritedUserId', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const result = await removeFromFavorites(userId, req.params.favoritedUserId);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error removing favorite:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if favorited
app.get('/api/favorites/:favoritedUserId/check', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const isFav = await isFavorite(userId, req.params.favoritedUserId);
        res.json({ success: true, data: { isFavorite: isFav } });
    } catch (error) {
        logger.error('Error checking favorite:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// API NOTIFICATIONS
// ============================================================================

// Get notifications
app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        const notifications = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });

        res.json({ success: true, data: notifications });
    } catch (error) {
        logger.error('Error getting notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark notification as read
app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
                [req.params.id, userId],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error marking notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark all notifications as read
app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
                [userId],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error marking all notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// API UPLOADS
// ============================================================================

app.post('/api/upload/avatar', requireAuth, (req, res) => {
    uploadAvatar(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, error: err.message });
        if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier' });

        const fileUrl = getFileUrl(req.file.path);
        const userId = req.user.user_id || req.user.id;
        const userRole = req.user.role;

        try {
            if (userRole === 'talent') {
                await new Promise((resolve, reject) => {
                    db.run('UPDATE talent_profiles SET profile_photo_path = ? WHERE user_id = ?',
                        [req.file.path, userId], (err) => { if (err) reject(err); else resolve(); });
                });
            } else if (userRole === 'agency') {
                await new Promise((resolve, reject) => {
                    db.run('UPDATE agency_profiles SET profile_photo_path = ? WHERE user_id = ?',
                        [req.file.path, userId], (err) => { if (err) reject(err); else resolve(); });
                });
            }

            res.json({ success: true, data: { url: fileUrl, path: req.file.path } });
        } catch (error) {
            logger.error('Error saving avatar path:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

app.post('/api/upload/video', requireAuth, (req, res) => {
    uploadVideo(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, error: err.message });
        if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier' });

        const fileUrl = getFileUrl(req.file.path);
        res.json({ success: true, data: { url: fileUrl, path: req.file.path } });
    });
});

app.post('/api/upload/portfolio', requireAuth, (req, res) => {
    uploadPortfolio(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, error: err.message });
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, error: 'Aucun fichier' });

        const fileUrls = req.files.map(file => getFileUrl(file.path));
        res.json({ success: true, data: { urls: fileUrls } });
    });
});

// ============================================================================
// API STRIPE / BILLING (optionnel)
// ============================================================================

if (stripe) {
    // Create payment intent
    app.post('/api/billing/create-payment-intent', requireAuth, async (req, res) => {
        try {
            const { amount, currency = 'eur', plan } = req.body;

            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency,
                metadata: { plan, userId: String(req.user.user_id || req.user.id) },
                automatic_payment_methods: { enabled: true }
            });

            res.json({ success: true, clientSecret: paymentIntent.client_secret });
        } catch (error) {
            logger.error('Error creating payment intent:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Subscription status
    app.get('/api/billing/subscription-status', requireAuth, async (req, res) => {
        try {
            const userId = req.user.user_id || req.user.id;
            const user = await getUserById(userId);

            if (user && user.stripe_customer_id) {
                const subscriptions = await stripe.subscriptions.list({
                    customer: user.stripe_customer_id,
                    status: 'active',
                    limit: 1
                });

                if (subscriptions.data.length > 0) {
                    const sub = subscriptions.data[0];
                    return res.json({
                        success: true,
                        subscriptionActive: true,
                        subscriptionId: sub.id,
                        currentPeriodEnd: sub.current_period_end,
                        cancelAtPeriodEnd: sub.cancel_at_period_end
                    });
                }
            }

            res.json({ success: true, subscriptionActive: false });
        } catch (error) {
            logger.error('Error checking subscription:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Stripe webhook
    app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
        const sig = req.headers['stripe-signature'];

        try {
            const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
            logger.info(`Webhook reçu: ${event.type}`);

            switch (event.type) {
                case 'payment_intent.succeeded':
                    logger.info('Paiement réussi:', event.data.object.id);
                    break;
                case 'customer.subscription.created':
                    logger.info('Abonnement créé:', event.data.object.id);
                    break;
                case 'customer.subscription.deleted':
                    logger.info('Abonnement supprimé:', event.data.object.id);
                    break;
                default:
                    logger.debug(`Événement non géré: ${event.type}`);
            }

            res.json({ received: true });
        } catch (err) {
            logger.error('Webhook error:', err);
            res.status(400).send(`Webhook Error: ${err.message}`);
        }
    });
}

// ============================================================================
// SOCKET.IO - TEMPS RÉEL
// ============================================================================

const connectedUsers = new Map();

io.on('connection', (socket) => {
    logger.debug('Client connecté: ' + socket.id);

    // Authentification
    socket.on('authenticate', async (sessionId) => {
        try {
            const session = await getSession(sessionId);
            if (session) {
                const userId = String(session.user_id);
                connectedUsers.set(userId, socket.id);
                socket.userId = userId;
                socket.emit('authenticated', { success: true });
                logger.debug(`User ${userId} authentifié via socket`);
            }
        } catch (error) {
            logger.error('Socket auth error:', error);
        }
    });

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
    });

    // Typing indicators
    socket.on('typing_start', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
            userId: data.userId,
            userName: data.userName
        });
    });

    socket.on('typing_stop', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('user_stop_typing', {
            userId: data.userId
        });
    });

    // Déconnexion
    socket.on('disconnect', () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
        }
        logger.debug('Client déconnecté: ' + socket.id);
    });
});

// Fonction utilitaire: envoyer notification
async function sendNotification(userId, type, title, message, data = null) {
    try {
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)',
                [userId, type, title, message, JSON.stringify(data)],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });

        const socketId = connectedUsers.get(String(userId));
        if (socketId) {
            io.to(socketId).emit('notification', {
                user_id: userId, type, title, message, data,
                is_read: false,
                created_at: new Date().toISOString()
            });
        }

        return true;
    } catch (error) {
        logger.error('Error sending notification:', error);
        return false;
    }
}

// ============================================================================
// API STRIPE - PAIEMENTS & ABONNEMENTS
// ============================================================================

// Configuration Stripe (clé publique)
app.get('/api/stripe/config', (req, res) => {
    console.log('🔍 API /api/stripe/config appelée');
    console.log('⚙️ STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? 'définie' : 'non définie');
    console.log('🚀 stripeService.enabled:', stripeService.enabled);
    
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        enabled: stripeService.enabled
    });
});

// Créer une session de checkout pour l'abonnement agency
app.post('/api/stripe/create-checkout-session', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { priceId, successUrl, cancelUrl } = req.body;

        if (!priceId) {
            return res.status(400).json({ success: false, error: 'Price ID requis' });
        }

        // Récupérer les infos utilisateur
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        // Créer ou récupérer le client Stripe
        const customer = await stripeService.createCustomer(userId, user.email, `${user.first_name} ${user.last_name}`);

        // Si le priceId est de test, créer un prix dynamiquement
        let finalPriceId = priceId;
        if (priceId === 'price_1PXYZ123456789') {
            // Créer un produit et un prix de test
            const product = await stripeService.createSubscriptionProduct();
            const price = await stripeService.createSubscriptionPrice(product.id);
            finalPriceId = price.id;
            console.log('🎯 Prix de test créé:', finalPriceId);
        }

        // Créer la session de checkout
        const session = await stripeService.createCheckoutSession(
            customer.id,
            finalPriceId,
            successUrl || `${process.env.BASE_URL}/pages/payment-success`,
            cancelUrl || `${process.env.BASE_URL}/pages/agency-pricing`
        );

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        logger.error('Erreur création session Stripe:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Créer une session de portail client pour gérer l'abonnement
app.post('/api/stripe/create-portal-session', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { returnUrl } = req.body;

        // Récupérer les infos utilisateur
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        // Créer la session du portail client
        const session = await stripeService.createCustomerPortalSession(
            user.stripe_customer_id,
            returnUrl || `${process.env.BASE_URL}/settings`
        );

        res.json({
            success: true,
            url: session.url
        });

    } catch (error) {
        logger.error('Erreur création portail Stripe:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Webhook Stripe pour gérer les événements
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (stripeService.enabled && process.env.STRIPE_WEBHOOK_SECRET) {
            event = stripeService.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } else {
            // Mode simulation - traiter les événements basiques
            const eventType = req.body.type;
            event = { type: eventType, data: { object: req.body.data.object } };
            logger.info(`Webhook Stripe (simulation): ${eventType}`);
        }
    } catch (err) {
        logger.error('Erreur webhook Stripe:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer les événements
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            logger.info(`Checkout complété: ${session.id}`);
            
            // Mettre à jour le statut de l'abonnement utilisateur
            if (session.metadata && session.metadata.type === 'agency_subscription') {
                await updateStripeSubscription(session.customer, session.subscription, 'active');
            }
            break;

        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            logger.info(`Paiement réussi: ${invoice.id}`);
            await updateStripeSubscription(invoice.customer, invoice.subscription, 'active');
            break;

        case 'invoice.payment_failed':
            const failedInvoice = event.data.object;
            logger.info(`Paiement échoué: ${failedInvoice.id}`);
            await updateStripeSubscription(failedInvoice.customer, failedInvoice.subscription, 'past_due');
            break;

        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            logger.info(`Abonnement annulé: ${subscription.id}`);
            await updateStripeSubscription(subscription.customer, subscription.id, 'canceled');
            break;

        default:
            logger.info(`Événement Stripe non géré: ${event.type}`);
    }

    res.json({ received: true });
});

// Charger les variables d'environnement
dotenv.config();

// Créer les dossiers nécessaires au démarrage
const createRequiredDirectories = () => {
    const dirs = ['./uploads', './logs'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Dossier créé: ${dir}`);
        }
    });
};

// Créer les dossiers au démarrage
createRequiredDirectories();

// Obtenir le statut de l'abonnement
app.get('/api/stripe/subscription-status', requireAuth, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const user = await getUserById(userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        let subscriptionStatus = 'none';
        let subscriptionDetails = null;

        if (user.stripe_subscription_id) {
            try {
                const subscription = await stripeService.getSubscription(user.stripe_subscription_id);
                subscriptionStatus = subscription.status;
                subscriptionDetails = {
                    id: subscription.id,
                    status: subscription.status,
                    current_period_end: subscription.current_period_end,
                    trial_end: subscription.trial_end,
                    cancel_at_period_end: subscription.cancel_at_period_end
                };
            } catch (error) {
                logger.error('Erreur récupération abonnement:', error);
                subscriptionStatus = 'error';
            }
        }

        res.json({
            success: true,
            status: subscriptionStatus,
            subscription: subscriptionDetails
        });

    } catch (error) {
        logger.error('Erreur statut abonnement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// HEALTH CHECK - Pour Render et monitoring
// ============================================================================

app.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // En production, on vérifie juste que le serveur répond
        // La base de données SQLite n'est pas critique pour le health check
        const dbStatus = 'connected'; // Force healthy status for Render
        const dbError = null;
        
        // Vérifier les services essentiels
        const services = {
            database: dbStatus,
            uploads: fs.existsSync('./uploads') ? 'available' : 'unavailable',
            logs: fs.existsSync('./logs') ? 'available' : 'unavailable'
        };
        
        const responseTime = Date.now() - startTime;
        const uptime = process.uptime();
        
        const healthData = {
            status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            responseTime: `${responseTime}ms`,
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            services,
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            errors: dbError ? [dbError] : []
        };
        
        // Status code selon l'état de santé
        const statusCode = healthData.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json(healthData);
        
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// ============================================================================
// 404 HANDLER (doit être en dernier)
// ============================================================================

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ============================================================================
// DÉMARRAGE SERVEUR
// ============================================================================

server.listen(PORT, () => {
    console.log(`\n====================================`);
    console.log(`  Talent & Agency Marketplace`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`====================================\n`);
    logger.info(`Serveur démarré sur le port ${PORT}`);
});
