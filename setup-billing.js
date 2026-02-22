const fs = require('fs');
const DB = require('./db');

// Créer les tables nécessaires pour le système de paiement
async function createBillingTables() {
    const isPostgres = DB.isPostgres;
    const serial = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const timestamp = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    
    await DB.query(`CREATE TABLE IF NOT EXISTS subscriptions (
        id ${serial},
        user_id INTEGER NOT NULL,
        plan_type TEXT NOT NULL,
        status TEXT NOT NULL,
        trial_end_date ${timestamp},
        next_billing_date ${timestamp},
        cancelled_at ${timestamp},
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        created_at ${timestamp} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestamp} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS invoices (
        id ${serial},
        user_id INTEGER NOT NULL,
        subscription_id INTEGER,
        invoice_number TEXT UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT NOT NULL,
        billing_date ${timestamp} NOT NULL,
        paid_date ${timestamp},
        due_date ${timestamp},
        stripe_invoice_id TEXT,
        invoice_url TEXT,
        pdf_url TEXT,
        created_at ${timestamp} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS payments (
        id ${serial},
        user_id INTEGER NOT NULL,
        invoice_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT NOT NULL,
        payment_method TEXT,
        stripe_payment_intent_id TEXT,
        stripe_charge_id TEXT,
        failure_reason TEXT,
        refunded_amount DECIMAL(10,2) DEFAULT 0,
        refunded_at ${timestamp},
        created_at ${timestamp} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS subscription_plans (
        id ${serial},
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        billing_interval TEXT NOT NULL,
        trial_days INTEGER DEFAULT 0,
        features TEXT,
        stripe_price_id TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at ${timestamp} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestamp} DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await DB.query(`CREATE TABLE IF NOT EXISTS billing_events (
        id ${serial},
        user_id INTEGER NOT NULL,
        subscription_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,
        stripe_event_id TEXT,
        created_at ${timestamp} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
    )`);
    
    console.log('✅ Tables de facturation créées');
}

// Insérer les plans d'abonnement par défaut
async function insertDefaultPlans() {
    const plans = [
        { name: 'Basic Plan', type: 'basic', price: 15.00, currency: 'USD', billing_interval: '2weeks', trial_days: 14, features: JSON.stringify(['Send unlimited messages', 'View talent profiles', 'Basic search filters', 'Email support']) },
        { name: 'Premium Plan', type: 'premium', price: 29.00, currency: 'USD', billing_interval: 'month', trial_days: 14, features: JSON.stringify(['All Basic features', 'Advanced search filters', 'Priority messaging', 'Profile analytics', '24/7 support']) },
        { name: 'Enterprise Plan', type: 'enterprise', price: 99.00, currency: 'USD', billing_interval: 'month', trial_days: 30, features: JSON.stringify(['All Premium features', 'Custom branding', 'API access', 'Dedicated account manager', 'Custom integrations']) }
    ];
    
    const insertSql = DB.isPostgres
        ? 'INSERT INTO subscription_plans (name, type, price, currency, billing_interval, trial_days, features) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (name) DO NOTHING'
        : 'INSERT OR IGNORE INTO subscription_plans (name, type, price, currency, billing_interval, trial_days, features) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    for (const plan of plans) {
        await DB.execute(insertSql, [plan.name, plan.type, plan.price, plan.currency, plan.billing_interval, plan.trial_days, plan.features]);
    }
    
    console.log('✅ Plans d\'abonnement par défaut insérés');
}

// Créer le dossier pour les factures PDF
function createBillingFolders() {
    const folders = ['./invoices', './invoices/pdf'];
    
    folders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
            console.log(`✅ Dossier créé: ${folder}`);
        }
    });
}

// Installer les dépendances nécessaires
function installBillingDependencies() {
    const { execSync } = require('child_process');
    
    try {
        console.log('📦 Installation des dépendances de facturation...');
        execSync('npm install stripe pdfkit moment', { stdio: 'inherit' });
        console.log('✅ Dépendances installées');
    } catch (error) {
        console.log('⚠️ Erreur installation dépendances:', error.message);
    }
}

// Initialiser le système de facturation
async function initializeBillingSystem() {
    console.log('🚀 Initialisation du système de facturation...');
    
    await createBillingTables();
    await insertDefaultPlans();
    createBillingFolders();
    
    console.log('✅ Système de facturation initialisé');
    console.log('');
    console.log('📋 Fonctionnalités ajoutées:');
    console.log('   ✅ Facturation et historique des paiements');
    console.log('   ✅ Essai gratuit configurable');
    console.log('   ✅ Renouvellement automatique');
    console.log('   ✅ Gestion des abonnements');
    console.log('   ✅ Génération de factures PDF');
    console.log('   ✅ Événements de facturation');
    console.log('');
    console.log('🔧 Variables d\'environnement à ajouter:');
    console.log('   STRIPE_SECRET_KEY=sk_test_...');
    console.log('   STRIPE_PUBLISHABLE_KEY=pk_test_...');
    console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');
    console.log('');
    console.log('🌐 Pour créer les clés Stripe:');
    console.log('   1. Créer un compte sur stripe.com');
    console.log('   2. Activer le mode test');
    console.log('   3. Copier les clés depuis le dashboard');
}

initializeBillingSystem();
