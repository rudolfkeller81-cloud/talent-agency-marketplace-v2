// Script to add password_resets table
const DB = require('./lib/database');

async function addPasswordResetsTable() {
    try {
        console.log('🔧 Adding password_resets table...');
        
        // Create password_resets table
        await DB.execute(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                used BOOLEAN DEFAULT FALSE
            )
        `);
        
        // Create indexes for better performance
        await DB.execute(`
            CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)
        `);
        
        await DB.execute(`
            CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)
        `);
        
        await DB.execute(`
            CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at)
        `);
        
        console.log('✅ Password resets table created successfully!');
        
        // Clean up expired tokens
        await DB.execute(`
            DELETE FROM password_resets 
            WHERE expires_at < datetime('now') OR used = TRUE
        `);
        
        console.log('🧹 Cleaned up expired tokens');
        
    } catch (error) {
        console.error('❌ Error creating password_resets table:', error);
        throw error;
    }
}

// Run the function
addPasswordResetsTable()
    .then(() => {
        console.log('🎉 Password resets table setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    });
