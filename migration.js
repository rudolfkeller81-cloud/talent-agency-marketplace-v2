// Migration script pour ajouter les champs d'abonnement
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./talent_agency.db');

console.log('🔄 Début de la migration des champs d\'abonnement...');

// Vérifier si les colonnes existent déjà
db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
        console.error('❌ Erreur:', err);
        process.exit(1);
    }

    const columnNames = columns.map(col => col.name);
    console.log('📋 Colonnes actuelles:', columnNames);

    // Ajouter les colonnes manquantes
    const migrations = [
        {
            name: 'subscription_active',
            sql: 'ALTER TABLE users ADD COLUMN subscription_active BOOLEAN DEFAULT FALSE'
        },
        {
            name: 'plan_type',
            sql: 'ALTER TABLE users ADD COLUMN plan_type VARCHAR(50) DEFAULT \'free\''
        },
        {
            name: 'subscription_status',
            sql: 'ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) DEFAULT \'inactive\''
        },
        {
            name: 'stripe_customer_id',
            sql: 'ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255)'
        }
    ];

    let migrationsToRun = migrations.filter(mig => !columnNames.includes(mig.name));
    
    if (migrationsToRun.length === 0) {
        console.log('✅ Toutes les colonnes existent déjà !');
        db.close();
        return;
    }

    console.log(`📝 ${migrationsToRun.length} colonnes à ajouter...`);

    // Exécuter les migrations une par une
    let completed = 0;
    
    migrationsToRun.forEach((migration, index) => {
        db.run(migration.sql, (err) => {
            if (err) {
                // Ignorer l'erreur si la colonne existe déjà
                if (err.message.includes('duplicate column name')) {
                    console.log(`⚠️  Colonne ${migration.name} existe déjà`);
                } else {
                    console.error(`❌ Erreur ajout ${migration.name}:`, err.message);
                }
            } else {
                console.log(`✅ Colonne ${migration.name} ajoutée avec succès`);
            }
            
            completed++;
            if (completed === migrationsToRun.length) {
                console.log('🎉 Migration terminée !');
                
                // Mettre à jour les utilisateurs existants
                db.run('UPDATE users SET subscription_active = FALSE WHERE subscription_active IS NULL', (err) => {
                    if (err) console.error('❌ Erreur mise à jour subscription_active:', err);
                    else console.log('✅ subscription_active mis à jour pour les utilisateurs existants');
                });
                
                db.run('UPDATE users SET plan_type = \'free\' WHERE plan_type IS NULL', (err) => {
                    if (err) console.error('❌ Erreur mise à jour plan_type:', err);
                    else console.log('✅ plan_type mis à jour pour les utilisateurs existants');
                });
                
                db.run('UPDATE users SET subscription_status = \'inactive\' WHERE subscription_status IS NULL', (err) => {
                    if (err) console.error('❌ Erreur mise à jour subscription_status:', err);
                    else console.log('✅ subscription_status mis à jour pour les utilisateurs existants');
                    
                    // Fermer la base de données
                    setTimeout(() => {
                        db.close();
                        console.log('🔒 Base de données fermée');
                        process.exit(0);
                    }, 1000);
                });
            }
        });
    });
});
