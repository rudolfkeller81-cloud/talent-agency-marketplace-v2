const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Nettoyer complètement la base de données
const dbPath = './database.sqlite';
const db = new sqlite3.Database(dbPath);

console.log('🧹 Nettoyage COMPLET de la base de données...');

db.serialize(() => {
    // Supprimer TOUTES les conversations
    db.run(`DELETE FROM conversations`, (err) => {
        if (err) {
            console.error('❌ Erreur suppression conversations:', err);
        } else {
            console.log('✅ Toutes les conversations supprimées');
        }
    });

    // Supprimer TOUS les messages
    db.run(`DELETE FROM messages`, (err) => {
        if (err) {
            console.error('❌ Erreur suppression messages:', err);
        } else {
            console.log('✅ Tous les messages supprimés');
        }
    });

    // Supprimer TOUS les favoris
    db.run(`DELETE FROM favorites`, (err) => {
        if (err) {
            console.error('❌ Erreur vidage favorites:', err);
        } else {
            console.log('✅ Tous les favoris supprimés');
        }
    });

    // Supprimer les utilisateurs de test (garder seulement les vrais)
    db.run(`DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%bob%' OR email LIKE '%demo%' OR first_name = 'Bob' OR first_name LIKE '%test%'`, (err) => {
        if (err) {
            console.error('❌ Erreur suppression utilisateurs test:', err);
        } else {
            console.log('✅ Utilisateurs de test supprimés');
        }
    });

    // Réinitialiser les profils de test
    db.run(`DELETE FROM talent_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`, (err) => {
        if (err) {
            console.error('❌ Erreur suppression profils test:', err);
        } else {
            console.log('✅ Profils de test supprimés');
        }
    });

    db.run(`DELETE FROM agency_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`, (err) => {
        if (err) {
            console.error('❌ Erreur suppression agences test:', err);
        } else {
            console.log('✅ Agences de test supprimées');
        }
    });
});

setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('❌ Erreur fermeture DB:', err);
        } else {
            console.log('🎉 Base de données complètement nettoyée !');
            console.log('🔄 Redémarrez le serveur pour repartir à zéro');
        }
        process.exit(0);
    });
}, 1500);
