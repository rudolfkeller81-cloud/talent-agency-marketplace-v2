// Système d'authentification
const bcrypt = require('bcrypt')
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');
const DB = require('./db');

// Compatibilité: exposer db (sqliteDb ou null en PG)
const db = DB.sqliteDb;

// Initialiser la base de données
async function initDatabase() {
    await DB.initSchema();
    logger.info('Base de données initialisée');
}

// Valider la robustesse du mot de passe
// Retourne un message d'erreur ou null si valide
function validatePassword(password) {
    if (!password || password.length < 8) {
        return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Le mot de passe doit contenir au moins une majuscule';
    }
    if (!/[0-9]/.test(password)) {
        return 'Le mot de passe doit contenir au moins un chiffre';
    }
    return null;
}

// Hash password
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Vérifier password
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Inscription
async function registerUser(userData) {
    const { email, firstName, lastName, password, role, agencyProfile, talentProfile } = userData;
    
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        throw new Error('Cet email est déjà utilisé');
    }
    
    const passwordHash = await hashPassword(password);
    
    let userId;
    // Set default subscription values based on role
    const defaultSubscriptionActive = role === 'agency';
    const defaultPlanType = role === 'agency' ? 'premium' : 'free';
    const defaultSubscriptionStatus = role === 'agency' ? 'active' : 'inactive';
    
    if (DB.isPostgres) {
        const result = await DB.queryOne(
            'INSERT INTO users (email, first_name, last_name, password_hash, role, subscription_active, plan_type, subscription_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [email, firstName, lastName, passwordHash, role || 'talent', defaultSubscriptionActive, defaultPlanType, defaultSubscriptionStatus]
        );
        userId = result.id;
    } else {
        const result = await DB.execute(
            'INSERT INTO users (email, first_name, last_name, password_hash, role, subscription_active, plan_type, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [email, firstName, lastName, passwordHash, role || 'talent', defaultSubscriptionActive, defaultPlanType, defaultSubscriptionStatus]
        );
        userId = result.lastID;
    }
    
    // Créer le profil spécifique selon le rôle
    if (role === 'agency' && agencyProfile) {
        try { await createAgencyProfile(userId, agencyProfile); }
        catch (e) { logger.error('Erreur création profil agence:', e); }
    } else if (role === 'talent' && talentProfile) {
        try { await createTalentProfile(userId, talentProfile); }
        catch (e) { logger.error('Erreur création profil talent:', e); }
    }
    
    return { id: userId, email, firstName, lastName, role, agencyProfile, talentProfile };
}

// Connexion
async function loginUser(email, password) {
    console.log('🔍 loginUser called with:', email);
    const user = await getUserByEmail(email);
    console.log('👤 User found:', !!user);
    if (!user) throw new Error('Email ou mot de passe incorrect');
    
    console.log('🔐 Verifying password...');
    const isValid = await verifyPassword(password, user.password_hash);
    console.log('✅ Password valid:', isValid);
    if (!isValid) throw new Error('Email ou mot de passe incorrect');
    
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    console.log('🎫 Session ID generated:', sessionId);
    await createSession(sessionId, user.id, expiresAt);
    
    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            planType: user.plan_type,
            subscriptionStatus: user.subscription_status,
            subscription_active: user.subscription_active || false
        },
        sessionId,
        expiresAt
    };
}

// Obtenir utilisateur par email
async function getUserByEmail(email) {
    console.log('🔍 getUserByEmail called with:', email);
    try {
        const user = await DB.queryOne('SELECT * FROM users WHERE email = ?', [email]);
        console.log('👤 getUserByEmail result:', !!user);
        return user;
    } catch (error) {
        console.error('❌ getUserByEmail error:', error);
        throw error;
    }
}

// Obtenir utilisateur par ID
async function getUserById(id) {
    return DB.queryOne(
        'SELECT id, email, first_name, last_name, role, subscription_active, plan_type, subscription_status, stripe_customer_id FROM users WHERE id = ?',
        [id]
    );
}

// Créer session
async function createSession(sessionId, userId, expiresAt) {
    const expiresAtISO = expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt).toISOString();
    await DB.execute('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', [sessionId, userId, expiresAtISO]);
}

// Vérifier session
async function getSession(sessionId) {
    const expireCheck = DB.isPostgres ? 'NOW()' : "datetime('now')";
    return DB.queryOne(
        `SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name, u.role, u.subscription_active, u.plan_type, u.is_admin, u.age_verified, u.verified, u.email_verified
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > ${expireCheck}`,
        [sessionId]
    );
}

// Déconnexion
async function logoutUser(sessionId) {
    await DB.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

// Mettre à jour utilisateur
async function updateUser(userId, updates) {
    const { firstName, lastName, email } = updates;
    await DB.execute(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [firstName, lastName, email, userId]
    );
}

// Mettre à jour abonnement Stripe
async function updateStripeSubscription(userId, subscriptionData) {
    const { stripeCustomerId, stripeSubscriptionId, planType, subscriptionStatus, subscriptionActive } = subscriptionData;
    await DB.execute(
        'UPDATE users SET stripe_customer_id = ?, stripe_subscription_id = ?, plan_type = ?, subscription_status = ?, subscription_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [stripeCustomerId, stripeSubscriptionId, planType, subscriptionStatus, subscriptionActive, userId]
    );
}

// Créer un profil d'agence
async function createAgencyProfile(userId, profileData) {
    const { platforms, talentCount, totalRevenue, description, links, profilePhoto } = profileData;
    const result = await DB.execute(
        'INSERT INTO agency_profiles (user_id, platforms, talent_count, total_revenue, description, links, profile_photo_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, platforms, talentCount || 0, totalRevenue || 0, description, links, profilePhoto]
    );
    return { id: result.lastID, userId };
}

// Créer un profil de talent
async function createTalentProfile(userId, profileData) {
    const { revenue, hasManager, platforms, otherPlatform, country, languages, age, socialMedia, otherSocial, totalFollowers, displayName, bio, profilePhoto, specialty, talentType } = profileData;
    
    const platformsStr = Array.isArray(platforms) ? platforms.join(', ') : (platforms || '');
    const languagesStr = Array.isArray(languages) ? languages.join(', ') : (languages || '');
    const socialMediaStr = Array.isArray(socialMedia) ? socialMedia.join(', ') : (socialMedia || '');

    const result = await DB.execute(
        `INSERT INTO talent_profiles (user_id, revenue, has_manager, platforms, other_platform, country, languages, age, social_media, other_social, total_followers, display_name, bio, avatar_path, talent_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, revenue || 0, hasManager || 'no', platformsStr, otherPlatform || null, country || null, languagesStr, age || null, socialMediaStr, otherSocial || null, totalFollowers || 0, displayName || null, bio || null, profilePhoto || null, talentType || specialty || '']
    );
    return { id: result.lastID, userId };
}

// Récupérer le profil d'une agence
async function getAgencyProfile(userId) {
    return DB.queryOne('SELECT * FROM agency_profiles WHERE user_id = ?', [userId]);
}

// Récupérer des utilisateurs par rôle (avec pagination et recommandations)
const ROLE_CONFIG = {
    talent: {
        select: `u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
                   u.verified, u.avatar_url, u.is_banned,
                   tp.bio, tp.platforms, tp.country, tp.revenue, tp.display_name,
                   tp.age, tp.has_manager, tp.languages, tp.social_media, tp.total_followers`,
        join: `LEFT JOIN talent_profiles tp ON u.id = tp.user_id`,
        recommendedOrder: `(COALESCE(tp.revenue, 0) * 0.4 + COALESCE(tp.total_followers, 0) * 0.0001 + CASE WHEN u.verified = 1 THEN 500 ELSE 0 END) DESC, u.created_at DESC`,
    },
    agency: {
        select: `u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
                   u.verified, u.avatar_url, u.is_banned,
                   ap.talent_count, ap.description, ap.platforms, ap.total_revenue, ap.agency_name`,
        join: `LEFT JOIN agency_profiles ap ON u.id = ap.user_id`,
        recommendedOrder: `(COALESCE(ap.total_revenue, 0) * 0.3 + COALESCE(ap.talent_count, 0) * 10 + CASE WHEN u.verified = 1 THEN 500 ELSE 0 END) DESC, u.created_at DESC`,
    },
};

async function _getUsers(role, { page = 1, limit = 12, recommended = false } = {}) {
    const offset = (page - 1) * limit;
    const { select, join, recommendedOrder } = ROLE_CONFIG[role];
    const order = recommended ? recommendedOrder : `u.created_at DESC`;
    const [rows, countRow] = await Promise.all([
        DB.queryAll(`
            SELECT ${select}
            FROM users u ${join}
            WHERE u.role = ? AND COALESCE(u.is_banned, 0) = 0
            ORDER BY ${order}
            LIMIT ? OFFSET ?
        `, [role, limit, offset]),
        DB.queryOne(`SELECT COUNT(*) as total FROM users WHERE role = ? AND COALESCE(is_banned, 0) = 0`, [role])
    ]);
    return { data: rows, total: countRow?.total || 0, page, limit };
}

async function getTalents(opts) { return _getUsers('talent', opts); }
async function getAgencies(opts) { return _getUsers('agency', opts); }

// Récupérer le profil d'un talent
async function getTalentProfile(userId) {
    return DB.queryOne('SELECT * FROM talent_profiles WHERE user_id = ?', [userId]);
}

// Profile management functions
const USER_SAFE_COLS = 'u.id, u.email, u.first_name, u.last_name, u.role, u.plan_type, u.subscription_active, u.created_at, u.avatar_url, u.verified, u.age_verified, u.is_admin, u.is_banned';

async function getUserProfile(userId) {
    return DB.queryOne(`
        SELECT ${USER_SAFE_COLS},
               tp.bio, tp.platforms, tp.country, tp.languages, tp.social_media,
               tp.revenue as monthly_revenue, tp.display_name, tp.specialty,
               tp.age, tp.has_manager, tp.other_platform, tp.total_followers,
               ap.talent_count, ap.description as agency_description, ap.platforms as agency_platforms,
               ap.total_revenue, ap.agency_name
        FROM users u
        LEFT JOIN talent_profiles tp ON u.id = tp.user_id
        LEFT JOIN agency_profiles ap ON u.id = ap.user_id
        WHERE u.id = ?
    `, [userId]);
}

async function updateUserProfile(userId, profileData) {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'talent') return updateTalentProfile(userId, profileData);
    if (user.role === 'agency') return updateAgencyProfile(userId, profileData);
    throw new Error('Invalid user role');
}

async function updateTalentProfile(userId, profileData) {
    const { revenue, hasManager, platforms, otherPlatform, country, languages, age, socialMedia, otherSocial, totalFollowers, displayName, bio, specialty, talentType } = profileData;
    const result = await DB.execute(
        `UPDATE talent_profiles SET 
            revenue = ?, has_manager = ?, platforms = ?, other_platform = ?, 
            country = ?, languages = ?, age = ?, social_media = ?, other_social = ?, 
            total_followers = ?, display_name = ?, bio = ?, talent_type = ?
         WHERE user_id = ?`,
        [revenue || 0, hasManager || 'no', JSON.stringify(platforms || []), otherPlatform, country, JSON.stringify(languages || []), age || 18, JSON.stringify(socialMedia || []), otherSocial, totalFollowers || 0, displayName, bio, talentType || specialty || '', userId]
    );
    return { success: true, changes: result.changes };
}

async function updateAgencyProfile(userId, profileData) {
    const { platforms, talentCount, totalRevenue, description, links } = profileData;
    const result = await DB.execute(
        'UPDATE agency_profiles SET platforms = ?, talent_count = ?, total_revenue = ?, description = ?, links = ? WHERE user_id = ?',
        [platforms, talentCount || 0, totalRevenue || 0, description, links, userId]
    );
    return { success: true, changes: result.changes };
}

async function getProfiles() {
    return DB.queryAll(`
        SELECT ${USER_SAFE_COLS}, 
               tp.bio as talent_bio, tp.platforms as talent_platforms, tp.country as talent_country,
               tp.revenue as talent_revenue, tp.display_name as talent_display_name, tp.talent_type as talent_specialty,
               ap.talent_count, ap.description as agency_description, ap.platforms as agency_platforms, ap.total_revenue
        FROM users u
        LEFT JOIN talent_profiles tp ON u.id = tp.user_id
        LEFT JOIN agency_profiles ap ON u.id = ap.user_id
        WHERE u.role IN ('talent', 'agency')
        ORDER BY u.created_at DESC
    `);
}

async function getProfileById(profileId) {
    return DB.queryOne(`
        SELECT ${USER_SAFE_COLS}, 
               tp.bio as talent_bio, tp.platforms as talent_platforms, tp.country as talent_country,
               tp.revenue as talent_revenue, tp.display_name as talent_display_name, tp.talent_type as talent_specialty,
               ap.talent_count, ap.description as agency_description, ap.platforms as agency_platforms, ap.total_revenue
        FROM users u
        LEFT JOIN talent_profiles tp ON u.id = tp.user_id
        LEFT JOIN agency_profiles ap ON u.id = ap.user_id
        WHERE u.id = ?
    `, [profileId]);
}

async function searchProfiles(searchQuery, type = 'all', filters = {}) {
    let sql = `
        SELECT ${USER_SAFE_COLS}, 
               tp.bio as talent_bio, tp.platforms as talent_platforms, tp.country as talent_country,
               tp.revenue as talent_revenue, tp.display_name as talent_display_name, tp.talent_type as talent_specialty,
               ap.talent_count, ap.description as agency_description, ap.platforms as agency_platforms, ap.total_revenue,
               CASE WHEN u.role = 'talent' THEN 'talent' ELSE 'agency' END as profile_type
        FROM users u
        LEFT JOIN talent_profiles tp ON u.id = tp.user_id
        LEFT JOIN agency_profiles ap ON u.id = ap.user_id
        WHERE u.role IN ('talent', 'agency')
    `;
    const params = [];
    
    if (searchQuery && searchQuery.trim() !== '') {
        sql += ` AND (
            u.first_name LIKE ? OR u.last_name LIKE ? OR tp.bio LIKE ? OR 
            tp.platforms LIKE ? OR tp.country LIKE ? OR tp.display_name LIKE ? OR
            tp.talent_type LIKE ? OR ap.description LIKE ? OR ap.platforms LIKE ?
        )`;
        const term = `%${searchQuery.trim()}%`;
        params.push(term, term, term, term, term, term, term, term, term);
    }
    
    if (type !== 'all') {
        sql += ` AND u.role = ?`;
        params.push(type);
    }
    
    sql += ` ORDER BY u.created_at DESC`;
    return DB.queryAll(sql, params);
}

// Favorites functions
async function addToFavorites(userId, favoritedUserId) {
    const insertSql = DB.isPostgres
        ? 'INSERT INTO favorites (user_id, favorited_user_id) VALUES (?, ?) ON CONFLICT DO NOTHING'
        : 'INSERT OR IGNORE INTO favorites (user_id, favorited_user_id) VALUES (?, ?)';
    const result = await DB.execute(insertSql, [userId, favoritedUserId]);
    return { success: true, id: result.lastID };
}

async function removeFromFavorites(userId, favoritedUserId) {
    const result = await DB.execute(
        'DELETE FROM favorites WHERE user_id = ? AND favorited_user_id = ?',
        [userId, favoritedUserId]
    );
    return { success: true, changes: result.changes };
}

async function getUserFavorites(userId) {
    return DB.queryAll(`
        SELECT ${USER_SAFE_COLS}, f.favorited_at,
               tp.bio as talent_bio, tp.platforms as talent_platforms, tp.country as talent_country,
               tp.revenue as talent_revenue, tp.display_name as talent_display_name, tp.specialty as talent_specialty,
               tp.age as talent_age, tp.has_manager as talent_has_manager, tp.total_followers as talent_total_followers,
               ap.talent_count, ap.description as agency_description, ap.platforms as agency_platforms,
               ap.total_revenue, ap.agency_name
        FROM favorites f
        JOIN users u ON f.favorited_user_id = u.id
        LEFT JOIN talent_profiles tp ON u.id = tp.user_id
        LEFT JOIN agency_profiles ap ON u.id = ap.user_id
        WHERE f.user_id = ?
        ORDER BY f.favorited_at DESC
    `, [userId]);
}

async function isFavorite(userId, favoritedUserId) {
    const row = await DB.queryOne(
        'SELECT 1 FROM favorites WHERE user_id = ? AND favorited_user_id = ?',
        [userId, favoritedUserId]
    );
    return !!row;
}

async function deleteUserAccount(userId) {
    await DB.execute('DELETE FROM favorites WHERE user_id = ? OR favorited_user_id = ?', [userId, userId]);
    await DB.execute('DELETE FROM talent_profiles WHERE user_id = ?', [userId]);
    await DB.execute('DELETE FROM agency_profiles WHERE user_id = ?', [userId]);
    await DB.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    await DB.execute('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
    const result = await DB.execute('DELETE FROM users WHERE id = ?', [userId]);
    return { success: true, changes: result.changes };
}

async function getUserMessages(userId) {
    return DB.queryAll(`
        SELECT m.*, 
               u.first_name as sender_first_name, u.last_name as sender_last_name,
               u.email as sender_email
        FROM messages_simple m
        JOIN users u ON m.sender_id = u.id
        WHERE m.receiver_id = ?
        ORDER BY m.created_at DESC
    `, [userId]);
}

async function sendMessage(senderId, receiverId, content) {
    console.log('sendMessage called with:', { senderId, receiverId, content });
    try {
        // Use the simple messages table that works
        console.log('Using messages_simple table...');
        const result = await DB.execute(
            'INSERT INTO messages_simple (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [senderId, receiverId, content]
        );
        console.log('Message inserted successfully in messages_simple:', result);
        return { success: true, id: result.lastID };
    } catch (error) {
        console.error('Error in sendMessage:', error);
        throw error;
    }
}

module.exports = {
    initDatabase,
    registerUser,
    loginUser,
    getUserByEmail,
    getUserById,
    getSession,
    createSession,
    logoutUser,
    updateStripeSubscription,
    createAgencyProfile,
    getAgencyProfile,
    createTalentProfile,
    getTalentProfile,
    getTalents,
    getAgencies,
    updateUser,
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
};
