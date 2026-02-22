// Script pour créer les tables d'abonnement
const Database = require('better-sqlite3');
const path = require('path');

class SubscriptionTables {
    constructor(dbPath = './talent_agency.db') {
        this.db = new Database(dbPath);
        this.createTables();
    }

    createTables() {
        console.log('🔧 Création des tables d\'abonnement...');
        
        try {
            // Table des abonnements des agences
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS agency_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    stripe_subscription_id TEXT UNIQUE NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
                    plan_type TEXT NOT NULL DEFAULT 'premium',
                    trial_end DATETIME,
                    current_period_start DATETIME NOT NULL,
                    current_period_end DATETIME NOT NULL,
                    canceled_at DATETIME,
                    ended_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            // Table des vues de profils (pour limiter pendant l'essai)
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS profile_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            // Table des limites quotidiennes
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS daily_limits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    date DATE NOT NULL,
                    profile_views_count INTEGER DEFAULT 0,
                    messages_sent_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            // Table des paiements
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
                    stripe_invoice_id TEXT,
                    amount INTEGER NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'usd',
                    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
                    payment_method TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            // Table des fonctionnalités par plan
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS plan_features (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plan_type TEXT NOT NULL,
                    feature_name TEXT NOT NULL,
                    feature_value TEXT,
                    is_enabled BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(plan_type, feature_name)
                )
            `);
            
            // Table des logs d'accès aux fonctionnalités
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS feature_access_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    feature_name TEXT NOT NULL,
                    access_granted BOOLEAN NOT NULL,
                    reason TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            // Insérer les fonctionnalités des plans
            this.insertPlanFeatures();
            
            // Créer les indexes
            this.createIndexes();
            
            console.log('✅ Tables d\'abonnement créées avec succès');
            
        } catch (error) {
            console.error('❌ Erreur création tables:', error);
            throw error;
        }
    }

    insertPlanFeatures() {
        console.log('📝 Insertion des fonctionnalités des plans...');
        
        const features = [
            // Plan d'essai
            ['trial', 'full_profile_view', '0', 0], // Pas d'accès complet pendant l'essai
            ['trial', 'discover_view', '1', 1], // Peut voir dans le discover
            ['trial', 'profile_click', '0', 0], // Ne peut pas cliquer sur les profils
            ['trial', 'messaging', 'limited', 1],
            ['trial', 'analytics', 'basic', 1],
            ['trial', 'support', 'basic', 1],
            ['trial', 'export_data', '0', 0],
            ['trial', 'custom_branding', '0', 0],
            
            // Plan premium
            ['premium', 'full_profile_view', 'unlimited', 1],
            ['premium', 'daily_profile_limit', 'unlimited', 1],
            ['premium', 'messaging', 'unlimited', 1],
            ['premium', 'analytics', 'advanced', 1],
            ['premium', 'support', 'priority', 1],
            ['premium', 'export_data', '1', 1],
            ['premium', 'custom_branding', '1', 1]
        ];
        
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO plan_features (plan_type, feature_name, feature_value, is_enabled)
            VALUES (?, ?, ?, ?)
        `);
        
        features.forEach(feature => {
            stmt.run(...feature);
        });
        
        console.log('✅ Fonctionnalités des plans insérées');
    }

    createIndexes() {
        console.log('🔍 Création des indexes...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_user_id ON agency_subscriptions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_status ON agency_subscriptions(status)',
            'CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_stripe_id ON agency_subscriptions(stripe_subscription_id)',
            'CREATE INDEX IF NOT EXISTS idx_profile_views_user_id ON profile_views(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON profile_views(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_limits(user_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)',
            'CREATE INDEX IF NOT EXISTS idx_feature_access_logs_user_id ON feature_access_logs(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_feature_access_logs_created_at ON feature_access_logs(created_at)'
        ];
        
        indexes.forEach(indexSql => {
            try {
                this.db.exec(indexSql);
            } catch (error) {
                console.warn(`⚠️ Erreur création index: ${indexSql}`, error.message);
            }
        });
        
        console.log('✅ Indexes créés');
    }

    // Vérifier si les tables existent
    checkTables() {
        const tables = [
            'agency_subscriptions',
            'profile_views',
            'daily_limits',
            'payments',
            'plan_features',
            'feature_access_logs'
        ];
        
        const existingTables = [];
        
        tables.forEach(table => {
            try {
                const result = this.db.prepare(`
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name=?
                `).get(table);
                
                if (result) {
                    existingTables.push(table);
                }
            } catch (error) {
                console.warn(`⚠️ Erreur vérification table ${table}:`, error.message);
            }
        });
        
        console.log(`📊 Tables existantes: ${existingTables.length}/${tables.length}`);
        return existingTables;
    }

    // Obtenir les statistiques des tables
    getTableStats() {
        const stats = {};
        
        const tables = [
            'agency_subscriptions',
            'profile_views', 
            'daily_limits',
            'payments',
            'plan_features',
            'feature_access_logs'
        ];
        
        tables.forEach(table => {
            try {
                const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                stats[table] = result.count;
            } catch (error) {
                stats[table] = 0;
            }
        });
        
        return stats;
    }

    close() {
        this.db.close();
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    try {
        const setup = new SubscriptionTables();
        
        console.log('\n📊 Statistiques des tables:');
        const stats = setup.getTableStats();
        Object.entries(stats).forEach(([table, count]) => {
            console.log(`  ${table}: ${count} enregistrements`);
        });
        
        console.log('\n✅ Setup des tables d\'abonnement terminé');
        setup.close();
        
    } catch (error) {
        console.error('❌ Erreur setup tables:', error);
        process.exit(1);
    }
}

module.exports = SubscriptionTables;
