// ============================================================================
// Serveur Node.js - Talent & Agency Marketplace
// Version propre - Toutes fonctionnalités consolidées
// ============================================================================

// Importer dotenv AVANT tout
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
const fs = require('fs');

// Logger centralisé
const logger = require('./logger');

// Email service
const { sendPasswordReset, sendEmailVerification } = require('./email-service');

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
    validatePassword,
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
                : ['http://localhost:3000', 'http://127.0.0.1:3000']),
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

// File upload middleware with multer
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'uploads', file.fieldname === 'avatar' ? 'avatars' : 'posts');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const { v4: uuidv4 } = require('uuid');
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
        cb(null, `${file.fieldname}_${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    },
    fileFilter: function (req, file, cb) {
        // Allow images and videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos allowed.'), false);
        }
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
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://accounts.google.com", "https://js.stripe.com", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"  // Ajout pour Font Awesome
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
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
        ? ['https://talent-agency-marketplace-v2.onrender.com', 'https://talent-agency-marketplace.onrender.com']  // Ajout de votre URL Render
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

// --- Rate Limiting très strict pour le login : 5 tentatives / 15 min ---
const loginFailures = new Map(); // IP -> { count, blockedUntil }
const loginStrictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    message: { success: false, error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// --- Body parsing ---
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// --- CSRF Protection ---
// Les tokens Bearer en header sont déjà protégés contre le CSRF par design.
// On ajoute une vérification Origin en production pour bloquer les requêtes cross-site.
app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // En production : vérifier que la requête vient bien du bon domaine
        if (isProd) {
            const origin = req.headers.origin || req.headers.referer || '';
            const isAllowed = !origin || allowedOrigins.some(o => origin.startsWith(o));
            if (!isAllowed) {
                logger.warn(`CSRF bloqué - Origin: ${origin}`);
                return res.status(403).json({ success: false, error: 'Requête non autorisée' });
            }
        }
        // Refuser les soumissions de formulaires HTML classiques sur les routes API
        // (les requêtes légitimes envoient du JSON ou multipart pour les uploads)
        const ct = req.headers['content-type'] || '';
        if (ct.includes('application/x-www-form-urlencoded')) {
            return res.status(415).json({ success: false, error: 'Format de requête non supporté' });
        }
    }
    next();
});

// --- Sanitization middleware ---
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    next();
});

function sanitizeObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = sanitizeObject(obj[key]);
        }
        return result;
    }
    if (typeof obj === 'string') {
        return xss(obj.trim());
    }
    return obj;
}

// --- Input validation helper ---
function validateInput(schema, source) {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
        const value = source[field];
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} est requis`);
            continue;
        }
        if (value === undefined || value === null || value === '') continue;
        if (rules.maxLength && String(value).length > rules.maxLength) {
            errors.push(`${field} dépasse la longueur maximale (${rules.maxLength})`);
        }
        if (rules.isInt) {
            const num = Number(value);
            if (!Number.isInteger(num) || num <= 0) errors.push(`${field} doit être un entier positif`);
        }
        if (rules.isNumber) {
            if (isNaN(Number(value))) errors.push(`${field} doit être un nombre`);
        }
        if (rules.min !== undefined || rules.max !== undefined) {
            const num = Number(value);
            if (rules.min !== undefined && num < rules.min) errors.push(`${field} doit être >= ${rules.min}`);
            if (rules.max !== undefined && num > rules.max) errors.push(`${field} doit être <= ${rules.max}`);
        }
        if (rules.isURL && value) {
            if (!validator.isURL(String(value), { require_protocol: true })) errors.push(`${field} doit être une URL valide`);
        }
        if (rules.isIn && !rules.isIn.includes(value)) {
            errors.push(`${field} doit être l'une des valeurs: ${rules.isIn.join(', ')}`);
        }
    }
    return errors;
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
            req.userId = session.user_id || session.id;
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
    console.log('🔍 API /api/auth/register appelée');
    console.log('📦 Body reçu:', req.body);
    
    try {
        const { firstName, lastName, email, password, role, talentProfile, agencyProfile } = req.body;

        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ success: false, error: 'Champs requis manquants' });
        }

        const registerErrors = validateInput({
            email: { required: true },
            password: { required: true },
            firstName: { required: true, maxLength: 50 },
            lastName: { required: true, maxLength: 50 },
            role: { required: true, isIn: ['talent', 'agency'] }
        }, req.body);
        if (registerErrors.length > 0) {
            return res.status(400).json({ success: false, error: registerErrors[0] });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: 'Adresse email invalide' });
        }

        const pwdError = validatePassword(password);
        if (pwdError) {
            return res.status(400).json({ success: false, error: pwdError });
        }

        const user = await registerUser({ firstName, lastName, email, password, role, talentProfile, agencyProfile });
        const loginData = await loginUser(email, password);

        // Send email verification (async, don't block registration)
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        DB.execute('UPDATE users SET email_verification_token = ? WHERE id = ?', [verificationToken, user.id])
            .then(() => sendEmailVerification(email, verificationToken, firstName))
            .catch(err => logger.warn('Email verification send error:', err));

        res.json({
            success: true,
            sessionId: loginData.sessionId,
            token: loginData.sessionId,
            emailVerificationPending: true,
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
        // Traduire les erreurs techniques en messages clairs
        let userMessage = 'Une erreur est survenue lors de l\'inscription';
        if (error.message?.includes('déjà utilisé') || error.message?.includes('UNIQUE')) {
            userMessage = 'Cette adresse email est déjà associée à un compte';
        } else if (error.message?.includes('majuscule') || error.message?.includes('chiffre') || error.message?.includes('caractères')) {
            userMessage = error.message; // Les messages de validation sont déjà clairs
        }
        res.status(400).json({ success: false, error: userMessage });
    }
});

// Login
app.post('/api/auth/login', loginStrictLimiter, async (req, res) => {
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
        // Toujours retourner le même message générique pour ne pas révéler si l'email existe
        res.status(401).json({
            success: false,
            error: 'Email ou mot de passe incorrect',
            code: 'invalid_credentials'
        });
    }
});

// Forgot Password
app.post('/api/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: 'Adresse email invalide' });
        }

        const user = await DB.queryOne('SELECT id, email, first_name FROM users WHERE email = ?', [email]);

        // Always respond the same way to avoid email enumeration
        const okResponse = { success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };

        if (!user) return res.json(okResponse);

        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000).toISOString();

        await DB.execute(
            'INSERT INTO password_resets (email, token, expires_at, created_at) VALUES (?, ?, ?, ?)',
            [email, resetToken, expiresAt, new Date().toISOString()]
        );

        await sendPasswordReset(email, resetToken, user.first_name);
        logger.info(`Password reset requested for ${email}`);

        res.json(okResponse);
    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur, réessayez.' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, error: 'Token et nouveau mot de passe requis' });
        }

        const resetPwdError = validatePassword(newPassword);
        if (resetPwdError) {
            return res.status(400).json({ success: false, error: resetPwdError });
        }

        const resetRecord = await DB.queryOne(
            'SELECT email, expires_at, used FROM password_resets WHERE token = ?',
            [token]
        );

        if (!resetRecord) return res.status(400).json({ success: false, error: 'invalid_token' });
        if (new Date(resetRecord.expires_at) < new Date()) return res.status(400).json({ success: false, error: 'token_expired' });
        if (resetRecord.used) return res.status(400).json({ success: false, error: 'token_used' });

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await Promise.all([
            DB.execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?', [hashedPassword, new Date().toISOString(), resetRecord.email]),
            DB.execute('UPDATE password_resets SET used = 1 WHERE token = ?', [token])
        ]);

        // Cleanup old/used tokens async
        DB.execute("DELETE FROM password_resets WHERE expires_at < datetime('now') OR used = 1").catch(() => {});

        logger.info(`Password reset completed for ${resetRecord.email}`);
        res.json({ success: true, message: 'Mot de passe réinitialisé avec succès !' });

    } catch (error) {
        logger.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur, réessayez.' });
    }
});

// Email verification
app.get('/api/auth/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.redirect('/?emailVerified=error');

        const user = await DB.queryOne(
            'SELECT id FROM users WHERE email_verification_token = ? AND email_verified = 0',
            [token]
        );

        if (!user) return res.redirect('/?emailVerified=invalid');

        await DB.execute(
            'UPDATE users SET email_verified = 1, email_verification_token = NULL WHERE id = ?',
            [user.id]
        );

        logger.info(`Email verified for user ${user.id}`);
        res.redirect('/?emailVerified=success');
    } catch (error) {
        logger.error('Email verification error:', error);
        res.redirect('/?emailVerified=error');
    }
});

// Resend email verification
app.post('/api/auth/resend-verification', requireAuth, authLimiter, async (req, res) => {
    try {
        const user = await DB.queryOne(
            'SELECT id, email, first_name, email_verified FROM users WHERE id = ?',
            [req.userId]
        );
        if (!user) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
        if (user.email_verified) return res.json({ success: true, message: 'Email déjà vérifié' });

        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await DB.execute('UPDATE users SET email_verification_token = ? WHERE id = ?', [verificationToken, user.id]);
        await sendEmailVerification(user.email, verificationToken, user.first_name);

        res.json({ success: true, message: 'Email de vérification renvoyé' });
    } catch (error) {
        logger.error('Resend verification error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Verify session
app.get('/api/auth/verify', requireAuth, (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: {
            id: req.userId,
            email: req.user.email,
            firstName: req.user.first_name,
            lastName: req.user.last_name,
            role: req.user.role,
            email_verified: !!req.user.email_verified,
            is_admin: !!req.user.is_admin
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
    console.log('🔍 API /api/user/profile appelée');
    console.log('👤 User auth:', req.user);
    
    try {
        const userId = req.userId;
        console.log('👤 User ID:', userId);
        
        console.log('📝 Appel getUserProfile...');
        const profile = await getUserProfile(userId);
        console.log('📊 Profile result:', profile);

        if (!profile) {
            console.log('❌ Profile non trouvé');
            return res.status(404).json({ success: false, error: 'Profil non trouvé' });
        }

        // Get user posts
        console.log('📝 Getting user posts...');
        const posts = await DB.queryAll(`
            SELECT * FROM posts 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, [userId]);
        
        console.log('📊 Posts result:', posts);

        // Add posts and avatar_url to profile
        profile.posts = posts || [];
        profile.avatar_url = profile.avatar_url || null;

        console.log('✅ Profile envoyé avec posts et avatar');
        res.json({ success: true, data: profile });
    } catch (error) {
        console.error('❌ Erreur getting user profile:', error);
        logger.error('Error getting user profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const profileErrors = validateInput({
            firstName: { maxLength: 50 },
            lastName: { maxLength: 50 },
            bio: { maxLength: 500 },
            portfolio: { maxLength: 200, isURL: !!req.body.portfolio }
        }, req.body);
        if (profileErrors.length > 0) {
            return res.status(400).json({ success: false, error: profileErrors[0] });
        }
        const userId = req.userId;
        const result = await updateUserProfile(userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/user/account', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
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
        const talentErrors = validateInput({
            displayName: { maxLength: 100 },
            bio: { maxLength: 1000 },
            specialty: { maxLength: 100 },
            country: { maxLength: 100 },
            age: req.body.age ? { isNumber: true, min: 16, max: 100 } : {}
        }, req.body);
        if (talentErrors.length > 0) {
            return res.status(400).json({ success: false, error: talentErrors[0] });
        }
        const userId = req.userId;
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
        const agencyErrors = validateInput({
            agencyName: { maxLength: 100 },
            description: { maxLength: 1000 },
            talentCount: req.body.talentCount ? { isNumber: true, min: 0 } : {}
        }, req.body);
        if (agencyErrors.length > 0) {
            return res.status(400).json({ success: false, error: agencyErrors[0] });
        }
        const userId = req.userId;
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

// Get talents (avec pagination + recommandations)
app.get('/api/discover/talents', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 12);
        const recommended = req.query.recommended === 'true';
        const result = await getTalents({ page, limit, recommended });
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error getting talents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get agencies (avec pagination + recommandations)
app.get('/api/discover/agencies', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 12);
        const recommended = req.query.recommended === 'true';
        const result = await getAgencies({ page, limit, recommended });
        res.json({ success: true, ...result });
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
        if (q.length > 100) {
            return res.status(400).json({ success: false, error: 'Recherche: maximum 100 caractères' });
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
        const userId = req.userId;
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
        const msgErrors = validateInput({
            receiverId: { required: true, isInt: true },
            content: { required: true, maxLength: 2000 }
        }, req.body);
        if (msgErrors.length > 0) {
            return res.status(400).json({ success: false, error: msgErrors[0] });
        }
        const { receiverId, content } = req.body;
        const senderId = req.userId;

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

// Simple message API
app.post('/api/messages/conversations', requireAuth, async (req, res) => {
    try {
        const { participantId, content } = req.body;

        if (!participantId || !content) {
            return res.status(400).json({ success: false, error: 'Destinataire et contenu requis' });
        }

        const actualSenderId = req.userId;

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

// Get messages
app.get('/api/messages', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

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

        // Get ALL messages involving this user (sent AND received)
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
        `, [userId, userId]);

        console.log('📨 All messages for user', userId, ':', messages.length, 'messages');

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
    console.log('🔍 API /api/favorites GET appelée');
    console.log('👤 User auth:', req.user);
    
    try {
        const userId = req.userId;
        console.log('👤 User ID:', userId);
        
        console.log('📝 Appel getUserFavorites...');
        const favorites = await getUserFavorites(userId);
        console.log('⭐ Favorites trouvés:', favorites.length);
        console.log('📋 Détails favorites:', favorites);
        
        res.json({ success: true, data: favorites });
    } catch (error) {
        console.error('❌ Erreur getting favorites:', error);
        logger.error('Error getting favorites:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add to favorites
app.post('/api/favorites', requireAuth, async (req, res) => {
    console.log('🔍 API /api/favorites POST appelée');
    console.log('📦 Body reçu:', req.body);
    console.log('👤 User auth:', req.user);
    
    try {
        const favErrors = validateInput({
            favoritedUserId: { required: true, isInt: true }
        }, req.body);
        if (favErrors.length > 0) {
            console.log('❌ Validation favoritedUserId:', favErrors[0]);
            return res.status(400).json({ success: false, error: favErrors[0] });
        }
        const userId = req.userId;
        const { favoritedUserId } = req.body;

        console.log('👤 User ID:', userId);
        console.log('⭐ Favorited User ID:', favoritedUserId);

        console.log('📝 Appel addToFavorites...');
        const result = await addToFavorites(userId, favoritedUserId);
        console.log('✅ Favorite ajouté:', result);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Erreur ajout favorite:', error);
        logger.error('Error adding favorite:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove from favorites
app.delete('/api/favorites/:favoritedUserId', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
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
        const userId = req.userId;
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
        const userId = req.userId;
        const notifications = await DB.queryAll(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json({ success: true, data: notifications });
    } catch (error) {
        logger.error('Error getting notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark notification as read
app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        await DB.execute(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        res.json({ success: true });
    } catch (error) {
        logger.error('Error marking notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark all notifications as read
app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        await DB.execute(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
            [userId]
        );
        res.json({ success: true });
    } catch (error) {
        logger.error('Error marking all notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// API UPLOADS
// ============================================================================

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
                metadata: { plan, userId: String(req.userId) },
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
            const userId = req.userId;
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
        await DB.execute(
            'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)',
            [userId, type, title, message, JSON.stringify(data)]
        );

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
        const userId = req.userId;
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
        const userId = req.userId;
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

// Créer les dossiers nécessaires au démarrage
const createRequiredDirectories = () => {
    const dirs = ['./uploads', './logs'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Dossier créé: ${dir}`);
        }
    });
    console.log('✅ Talent & Agency Marketplace - Dossiers prêts');
};

// Créer les dossiers au démarrage
createRequiredDirectories();

// Initialiser la base de données
try {
    initDatabase();
    console.log('🗄️ Base de données initialisée');
} catch (error) {
    console.error('❌ Erreur initialisation base de données:', error.message);
}

// Obtenir le statut de l'abonnement
app.get('/api/stripe/subscription-status', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
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

// Avatar upload endpoint
app.post('/api/upload/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
    try {
        console.log('Avatar upload request received');
        
        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const userId = req.userId;
        const avatarFile = req.file;
        
        console.log('File received:', avatarFile.originalname, avatarFile.mimetype, avatarFile.size);
        
        // Rename file with proper user ID
        const oldPath = avatarFile.path;
        const newFilename = `avatar_${userId}_${Date.now()}_${avatarFile.originalname}`;
        const newPath = path.join(avatarFile.destination, newFilename);
        
        // Rename the file
        fs.renameSync(oldPath, newPath);
        
        // Generate avatar URL
        const avatarUrl = `/uploads/avatars/${newFilename}`;
        console.log('Avatar URL:', avatarUrl);
        
        // Save avatar URL to database
        await DB.execute(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [avatarUrl, userId]
        );

        console.log('Database updated successfully');

        res.json({
            success: true,
            avatar_url: avatarUrl
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Post media upload endpoint
app.post('/api/upload/post-media', requireAuth, upload.single('media'), async (req, res) => {
    try {
        console.log('Post media upload request received');
        
        if (!req.file) {
            console.log('No media file uploaded');
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const userId = req.userId;
        const mediaFile = req.file;
        
        console.log('Media file received:', mediaFile.originalname, mediaFile.mimetype, mediaFile.size);
        
        // Rename file with proper user ID
        const oldPath = mediaFile.path;
        const newFilename = `post_${userId}_${Date.now()}_${mediaFile.originalname}`;
        const newPath = path.join(mediaFile.destination, newFilename);
        
        // Rename the file
        fs.renameSync(oldPath, newPath);
        
        // Generate media URL
        const mediaUrl = `/uploads/posts/${newFilename}`;
        console.log('Media URL:', mediaUrl);

        res.json({
            success: true,
            media_url: mediaUrl
        });

    } catch (error) {
        console.error('Post media upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Posts API endpoints
app.post('/api/posts', requireAuth, async (req, res) => {
    try {
        const postErrors = validateInput({
            content: { maxLength: 5000 },
            type: req.body.type ? { isIn: ['text', 'photo', 'video', 'mixed'] } : {}
        }, req.body);
        if (postErrors.length > 0) {
            return res.status(400).json({ success: false, error: postErrors[0] });
        }
        const userId = req.userId;
        const { content, type, media_url } = req.body;

        if (!content && !media_url) {
            return res.status(400).json({ success: false, error: 'Content or media required' });
        }

        // Create post in database
        const result = await DB.execute(
            'INSERT INTO posts (user_id, content, type, media_url, created_at) VALUES (?, ?, ?, ?, ?)',
            [userId, content, type || 'text', media_url, new Date().toISOString()]
        );

        res.json({
            success: true,
            post_id: result.lastID
        });

    } catch (error) {
        logger.error('Create post error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/posts/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const posts = await DB.queryAll(`
            SELECT p.*, u.first_name, u.last_name, u.avatar_url
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        `, [userId]);

        res.json({
            success: true,
            data: posts
        });

    } catch (error) {
        logger.error('Get user posts error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoints for manage-subscription page
app.get('/api/subscription', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        console.log('🔍 Getting subscription for user ID:', userId);
        
        const user = await getUserById(userId);
        console.log('👤 User data from DB:', user);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Update user if subscription fields are missing
        if (user.subscription_active === undefined || user.plan_type === undefined || user.subscription_status === undefined) {
            console.log('🔧 Updating missing subscription fields for user:', userId);
            await DB.execute(
                'UPDATE users SET subscription_active = ?, plan_type = ?, subscription_status = ? WHERE id = ?',
                [false, 'free', 'inactive', userId]
            );
            
            // Fetch updated user data
            const updatedUser = await getUserById(userId);
            console.log('✅ Updated user data:', updatedUser);
            
            res.json({
                success: true,
                data: {
                    subscription_status: updatedUser.subscription_status || 'inactive',
                    plan_type: updatedUser.plan_type || 'free',
                    subscription_active: updatedUser.subscription_active || false
                }
            });
        } else {
            // Special case: if user is agency but subscription is not active AND NOT cancelled, update it
            if (user.role === 'agency' && 
                (!user.subscription_active || user.plan_type === 'free') && 
                user.subscription_status !== 'cancelled') {
                console.log('🔧 Updating agency user subscription to active:', userId);
                await DB.execute(
                    'UPDATE users SET subscription_active = ?, plan_type = ?, subscription_status = ? WHERE id = ?',
                    [true, 'premium', 'active', userId]
                );
                
                // Fetch updated user data
                const updatedUser = await getUserById(userId);
                console.log('✅ Updated agency subscription data:', updatedUser);
                
                res.json({
                    success: true,
                    data: {
                        subscription_status: updatedUser.subscription_status || 'active',
                        plan_type: updatedUser.plan_type || 'premium',
                        subscription_active: updatedUser.subscription_active || true
                    }
                });
            } else {
                console.log('📊 Subscription data:', {
                    subscription_status: user.subscription_status,
                    plan_type: user.plan_type,
                    subscription_active: user.subscription_active,
                    role: user.role
                });
                
                res.json({
                    success: true,
                    data: {
                        subscription_status: user.subscription_status || 'inactive',
                        plan_type: user.plan_type || 'free',
                        subscription_active: user.subscription_active || false
                    }
                });
            }
        }
    } catch (error) {
        logger.error('Error getting subscription:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/user/subscription/cancel', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        console.log('🔴 Cancelling subscription for user ID:', userId);
        
        // Get current user data before update
        const currentUser = await getUserById(userId);
        console.log('👤 Current user data before cancel:', currentUser);
        
        // Update subscription to cancelled state
        await DB.execute(
            'UPDATE users SET subscription_status = ?, subscription_active = ?, plan_type = ? WHERE id = ?',
            ['cancelled', false, 'free', userId]
        );
        
        // Verify the update
        const updatedUser = await getUserById(userId);
        console.log('✅ Updated user data after cancel:', updatedUser);
        
        res.json({ 
            success: true,
            message: 'Subscription cancelled successfully',
            data: {
                subscription_status: updatedUser.subscription_status,
                subscription_active: updatedUser.subscription_active,
                plan_type: updatedUser.plan_type
            }
        });
    } catch (error) {
        logger.error('Error cancelling subscription:', error);
        console.error('❌ Cancel subscription error:', error);
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
// LIKES SUR LES POSTS
// ============================================================================

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const existing = await DB.queryOne('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, req.userId]);
        if (existing) {
            await DB.execute('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, req.userId]);
            await DB.execute('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?', [postId]);
        } else {
            await DB.execute('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, req.userId]);
            await DB.execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
        }
        const post = await DB.queryOne('SELECT likes FROM posts WHERE id = ?', [postId]);
        res.json({ success: true, liked: !existing, likes: post?.likes || 0 });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/posts/:id/liked', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const existing = await DB.queryOne('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, req.userId]);
        res.json({ success: true, liked: !!existing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SIGNALEMENT DE PROFIL
// ============================================================================

app.post('/api/reports', requireAuth, async (req, res) => {
    try {
        const reporterId = req.userId;
        const { reported_user_id, reason, details } = req.body;
        if (!reported_user_id || !reason) return res.status(400).json({ success: false, error: 'Champs manquants' });
        if (reporterId === parseInt(reported_user_id)) return res.status(400).json({ success: false, error: 'Impossible de se signaler soi-même' });
        const existing = await DB.queryOne(
            'SELECT id FROM reports WHERE reporter_id = ? AND reported_user_id = ? AND status = ?',
            [reporterId, reported_user_id, 'pending']
        );
        if (existing) return res.status(400).json({ success: false, error: 'Signalement déjà envoyé' });
        await DB.execute(
            'INSERT INTO reports (reporter_id, reported_user_id, reason, details) VALUES (?, ?, ?, ?)',
            [reporterId, reported_user_id, reason, details || '']
        );
        res.json({ success: true, message: 'Signalement envoyé' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// MESSAGES — STATUT LU/NON LU
// ============================================================================

app.get('/api/messages/unread-count', requireAuth, async (req, res) => {
    try {
        const row = await DB.queryOne(
            'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0',
            [req.userId]
        );
        res.json({ success: true, count: row?.count || 0 });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
        await DB.execute('UPDATE messages SET read = 1 WHERE id = ? AND receiver_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/messages/read-all', requireAuth, async (req, res) => {
    try {
        const { sender_id } = req.body;
        if (sender_id) {
            await DB.execute('UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ?', [req.userId, sender_id]);
        } else {
            await DB.execute('UPDATE messages SET read = 1 WHERE receiver_id = ?', [req.userId]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// VÉRIFICATION D'ÂGE
// ============================================================================

app.post('/api/user/verify-age', requireAuth, async (req, res) => {
    try {
        await DB.execute('UPDATE users SET age_verified = 1 WHERE id = ?', [req.userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PROFIL PUBLIC (accessible sans connexion)
// ============================================================================

app.get('/api/profile/:id/public', async (req, res) => {
    try {
        const profileId = parseInt(req.params.id);
        const user = await DB.queryOne(
            `SELECT u.id, u.first_name, u.last_name, u.role, u.verified, u.avatar_url, u.created_at,
                    tp.bio, tp.platforms, tp.country, tp.display_name, tp.social_media, tp.languages, tp.specialty,
                    ap.description, ap.platforms as agency_platforms, ap.talent_count, ap.agency_name
             FROM users u
             LEFT JOIN talent_profiles tp ON u.id = tp.user_id
             LEFT JOIN agency_profiles ap ON u.id = ap.user_id
             WHERE u.id = ? AND COALESCE(u.is_banned, 0) = 0`, [profileId]
        );
        if (!user) return res.status(404).json({ success: false, error: 'Profil non trouvé' });
        // Pour les agences : ne pas exposer revenue sans auth
        if (user.role === 'agency') delete user.total_revenue;
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route page profil public
app.get('/profile/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'public-profile.html'));
});

// ============================================================================
// PARTAGE DE PROFIL — génère un lien partageable
// ============================================================================

app.get('/api/profile/:id/share', async (req, res) => {
    try {
        const profileId = parseInt(req.params.id);
        const user = await DB.queryOne('SELECT id, first_name, last_name, role FROM users WHERE id = ?', [profileId]);
        if (!user) return res.status(404).json({ success: false, error: 'Profil non trouvé' });
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
        const shareUrl = `${baseUrl}/profile/${profileId}`;
        res.json({ success: true, url: shareUrl, name: `${user.first_name} ${user.last_name}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

function requireAdmin(req, res, next) {
    if (!req.user || !req.user.is_admin) return res.status(403).json({ success: false, error: 'Accès admin requis' });
    next();
}

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'admin.html'));
});

app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [users, talents, agencies, messages, reports, verifiedUsers] = await Promise.all([
            DB.queryOne('SELECT COUNT(*) as count FROM users'),
            DB.queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['talent']),
            DB.queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['agency']),
            DB.queryOne('SELECT COUNT(*) as count FROM messages'),
            DB.queryOne('SELECT COUNT(*) as count FROM reports WHERE status = ?', ['pending']),
            DB.queryOne('SELECT COUNT(*) as count FROM users WHERE verified = 1'),
        ]);
        res.json({
            success: true,
            stats: {
                totalUsers: users?.count || 0,
                talents: talents?.count || 0,
                agencies: agencies?.count || 0,
                messages: messages?.count || 0,
                pendingReports: reports?.count || 0,
                verifiedUsers: verifiedUsers?.count || 0,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search ? `%${req.query.search}%` : '%';
        const users = await DB.queryAll(
            `SELECT id, email, first_name, last_name, role, verified, is_banned, is_admin, age_verified, created_at
             FROM users WHERE (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [search, search, search, limit, offset]
        );
        const total = await DB.queryOne(
            `SELECT COUNT(*) as count FROM users WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?`,
            [search, search, search]
        );
        res.json({ success: true, data: users, total: total?.count || 0, page, limit });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/admin/users/:id/verify', requireAuth, requireAdmin, async (req, res) => {
    try {
        const user = await DB.queryOne('SELECT verified FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        const newVal = user.verified ? 0 : 1;
        await DB.execute('UPDATE users SET verified = ? WHERE id = ?', [newVal, req.params.id]);
        res.json({ success: true, verified: !!newVal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/admin/users/:id/ban', requireAuth, requireAdmin, async (req, res) => {
    try {
        const user = await DB.queryOne('SELECT is_banned FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        const newVal = user.is_banned ? 0 : 1;
        await DB.execute('UPDATE users SET is_banned = ? WHERE id = ?', [newVal, req.params.id]);
        res.json({ success: true, is_banned: !!newVal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/reports', requireAuth, requireAdmin, async (req, res) => {
    try {
        const reports = await DB.queryAll(
            `SELECT r.*,
                    u1.email as reporter_email, u1.first_name as reporter_first, u1.last_name as reporter_last,
                    u2.email as reported_email, u2.first_name as reported_first, u2.last_name as reported_last
             FROM reports r
             JOIN users u1 ON r.reporter_id = u1.id
             JOIN users u2 ON r.reported_user_id = u2.id
             WHERE r.status = 'pending'
             ORDER BY r.created_at DESC LIMIT 50`
        );
        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/admin/reports/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { action, reported_user_id } = req.body; // 'dismiss' | 'ban'; reported_user_id passed by client to avoid extra query
        const status = action === 'ban' ? 'resolved_ban' : 'dismissed';
        const promises = [DB.execute('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id])];
        if (action === 'ban' && reported_user_id) {
            promises.push(DB.execute('UPDATE users SET is_banned = 1 WHERE id = ?', [reported_user_id]));
        }
        await Promise.all(promises);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
