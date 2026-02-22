const fs = require('fs');
const DB = require('./db');

// Créer les tables nécessaires pour la messagerie avancée
async function createMessagingTables() {
    const serial = DB.isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const ts = DB.isPostgres ? 'TIMESTAMP' : 'DATETIME';
    
    await DB.query(`CREATE TABLE IF NOT EXISTS conversations (
        id ${serial},
        created_at ${ts} DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS messages (
        id ${serial},
        conversation_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT,
        message_type TEXT DEFAULT 'text',
        file_data TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at ${ts} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id),
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (receiver_id) REFERENCES users (id)
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS conversation_participants (
        id ${serial},
        conversation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at ${ts} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id ${serial},
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at ${ts} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS notifications (
        id ${serial},
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at ${ts} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    console.log('✅ Tables de messagerie avancées créées/mises à jour');
}

// Créer le dossier pour les fichiers de messages
function createMessageUploadFolder() {
    const uploadPath = './uploads/messages';
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log('✅ Dossier uploads/messages créé');
    }
}

// Installer les dépendances nécessaires
function installDependencies() {
    const { execSync } = require('child_process');
    
    try {
        console.log('📦 Installation des dépendances...');
        execSync('npm install web-push multer', { stdio: 'inherit' });
        console.log('✅ Dépendances installées');
    } catch (error) {
        console.log('⚠️ Erreur installation dépendances:', error.message);
    }
}

// Initialiser la messagerie avancée
async function initializeAdvancedMessaging() {
    console.log('🚀 Initialisation de la messagerie avancée...');
    
    await createMessagingTables();
    createMessageUploadFolder();
    
    console.log('✅ Messagerie avancée initialisée');
    console.log('');
    console.log('📋 Fonctionnalités ajoutées:');
    console.log('   ✅ Notifications temps réel (WebSocket)');
    console.log('   ✅ Envoi de fichiers (images, documents)');
    console.log('   ✅ Notifications push navigateur');
    console.log('   ✅ Statut en ligne des utilisateurs');
    console.log('   ✅ Indicateurs de frappe');
    console.log('   ✅ Accusés de lecture');
    console.log('');
    console.log('🔧 Variables d\'environnement à ajouter:');
    console.log('   VAPID_PUBLIC_KEY=votre_clé_publique');
    console.log('   VAPID_PRIVATE_KEY=votre_clé_privée');
    console.log('');
    console.log('🌐 Pour générer les clés VAPID:');
    console.log('   npx web-push generate-vapid-keys');
}

initializeAdvancedMessaging();
