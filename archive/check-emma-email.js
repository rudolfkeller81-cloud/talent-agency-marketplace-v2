// Vérifier spécifiquement l'email Emma
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

console.log('🔍 Checking Emma email...');

db.get('SELECT * FROM users WHERE email = ?', ['emma.demo@talent.com'], (err, row) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    if (row) {
        console.log('✅ Emma found:', row);
    } else {
        console.log('❌ Emma not found');
    }
    
    db.close();
});
