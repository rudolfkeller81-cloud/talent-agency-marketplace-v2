// Simple script to add password_resets table using SQLite directly
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function addPasswordResetsTable() {
    return new Promise((resolve, reject) => {
        console.log('🔧 Adding password_resets table...');
        
        // Create password_resets table
        db.run(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                used BOOLEAN DEFAULT FALSE
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creating table:', err);
                reject(err);
                return;
            }
            
            console.log('✅ Password resets table created successfully!');
            
            // Create indexes
            db.run(`CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)`, (err) => {
                if (err) {
                    console.error('❌ Error creating email index:', err);
                    reject(err);
                    return;
                }
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`, (err) => {
                if (err) {
                    console.error('❌ Error creating token index:', err);
                    reject(err);
                    return;
                }
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at)`, (err) => {
                if (err) {
                    console.error('❌ Error creating expires index:', err);
                    reject(err);
                    return;
                }
            });
            
            // Clean up expired tokens
            db.run(`DELETE FROM password_resets WHERE expires_at < datetime('now') OR used = TRUE`, (err) => {
                if (err) {
                    console.error('❌ Error cleaning up tokens:', err);
                    reject(err);
                    return;
                }
                
                console.log('🧹 Cleaned up expired tokens');
                console.log('🎉 Password resets table setup complete!');
                
                db.close((closeErr) => {
                    if (closeErr) {
                        console.error('❌ Error closing database:', closeErr);
                        reject(closeErr);
                    } else {
                        resolve();
                    }
                });
            });
        });
    });
}

// Run the function
addPasswordResetsTable()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    });
