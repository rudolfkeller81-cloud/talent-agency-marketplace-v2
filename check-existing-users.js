// Vérifier quels utilisateurs existent dans la base de données
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

console.log('🔍 Checking existing users...');

db.all('SELECT id, email, first_name, last_name FROM users LIMIT 10', (err, rows) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    console.log('✅ Users found:');
    rows.forEach(row => {
        console.log(`- ID: ${row.id}, Email: ${row.email}, Name: ${row.first_name} ${row.last_name}`);
    });
    
    db.close();
});
