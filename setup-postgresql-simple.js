const { execSync } = require('child_process');
const fs = require('fs');

// Configuration PostgreSQL simple avec SQL direct
async function setupPostgreSQLSimple() {
  console.log('🚀 Configuration PostgreSQL simple...');
  
  try {
    // 1. Créer le fichier .env.local
    const envContent = `DATABASE_URL="postgresql://postgres:password@localhost:5432/talent_agency?schema=public"`;
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ .env.local créé');
    
    // 2. Utiliser le client pg directement
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: 'postgresql://postgres:password@localhost:5432/talent_agency'
    });
    
    await client.connect();
    console.log('✅ Connexion à PostgreSQL réussie !');
    
    // 3. Créer les tables avec SQL
    console.log('🔍 Création des tables...');
    
    // Table users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        "userType" TEXT NOT NULL CHECK ("userType" IN ('TALENT', 'AGENCY')),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Table profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT UNIQUE NOT NULL,
        bio TEXT,
        location TEXT,
        "avatarUrl" TEXT,
        verified BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "stageName" TEXT,
        age TEXT,
        skills TEXT[],
        experience TEXT,
        rates JSONB,
        availability TEXT,
        "socialMedia" JSONB,
        "companyName" TEXT,
        website TEXT,
        phone TEXT,
        founded TEXT,
        "teamSize" TEXT,
        specialization TEXT[],
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Table messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "senderId" TEXT NOT NULL,
        "recipientId" TEXT NOT NULL,
        content TEXT NOT NULL,
        "isRead" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("senderId") REFERENCES users(id),
        FOREIGN KEY ("recipientId") REFERENCES users(id)
      )
    `);
    
    // Table favorites
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "profileId" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE("userId", "profileId")
      )
    `);
    
    // Table subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT UNIQUE NOT NULL,
        "stripeId" TEXT UNIQUE,
        status TEXT DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'CANCELED', 'EXPIRED')),
        "currentPeriodStart" TIMESTAMP,
        "currentPeriodEnd" TIMESTAMP,
        "trialEnd" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Tables créées avec succès !');
    
    // 4. Insérer un utilisateur de test
    const testResult = await client.query(`
      INSERT INTO users (email, password, firstName, lastName, "userType")
      VALUES ('test@talent-agency.com', '$2b$10$hashedpassword123', 'Test', 'User', 'TALENT')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `);
    
    if (testResult.rows.length > 0) {
      console.log('✅ Utilisateur de test créé:', testResult.rows[0]);
    } else {
      console.log('ℹ️ Utilisateur de test existe déjà');
    }
    
    // 5. Vérifier les tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tables créées:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // 6. Compter les utilisateurs
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Utilisateurs: ${userCount.rows[0].count}`);
    
    await client.end();
    console.log('🎉 PostgreSQL est 100% prêt !');
    
    // 7. Créer le module database.js pour le projet
    createDatabaseModule();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('💡 Solution: Vérifie que le mot de passe PostgreSQL est "password"');
    }
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 Solution: Crée la base de données "talent_agency"');
      console.log('   Commande: createdb talent_agency');
    }
    if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 Solution: Démarre le service PostgreSQL');
      console.log('   Services Windows > postgresql-x64-15 > Start');
    }
  }
}

function createDatabaseModule() {
  const databaseModule = `const { Client } = require('pg');

class Database {
  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/talent_agency'
    });
  }

  async connect() {
    await this.client.connect();
    console.log('✅ Connecté à PostgreSQL');
  }

  async disconnect() {
    await this.client.end();
  }

  // Utilisateurs
  async createUser(userData) {
    const { email, password, firstName, lastName, userType } = userData;
    const result = await this.client.query(
      'INSERT INTO users (email, password, firstName, lastName, "userType") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, password, firstName, lastName, userType]
    );
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const result = await this.client.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async getUserById(id) {
    const result = await this.client.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Profils
  async createProfile(profileData) {
    const fields = Object.keys(profileData);
    const values = Object.values(profileData);
    const placeholders = fields.map((_, i) => '$' + (i + 1)).join(', ');
    
    const query = \`INSERT INTO profiles (\${fields.map(f => '"' + f + '"').join(', ')}) VALUES (\${placeholders}) RETURNING *\`;
    const result = await this.client.query(query, values);
    return result.rows[0];
  }

  async updateProfile(userId, profileData) {
    const fields = Object.keys(profileData);
    const values = Object.values(profileData);
    values.push(userId); // Ajouter userId pour le WHERE
    
    const setClause = fields.map((f, i) => '"' + f + '" = $' + (i + 1)).join(', ');
    const query = \`UPDATE profiles SET \${setClause}, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $\${fields.length + 1} RETURNING *\`;
    
    const result = await this.client.query(query, values);
    return result.rows[0];
  }

  async getProfiles(type = null) {
    let query = 'SELECT p.*, u.email, u.firstName, u.lastName, u."userType" FROM profiles p JOIN users u ON p."userId" = u.id';
    if (type) {
      query += ' WHERE u."userType" = $1';
      const result = await this.client.query(query, [type]);
      return result.rows;
    }
    const result = await this.client.query(query);
    return result.rows;
  }

  // Messages
  async createMessage(messageData) {
    const { senderId, recipientId, content } = messageData;
    const result = await this.client.query(
      'INSERT INTO messages ("senderId", "recipientId", content) VALUES ($1, $2, $3) RETURNING *',
      [senderId, recipientId, content]
    );
    return result.rows[0];
  }

  async getMessages(userId) {
    const result = await this.client.query(
      'SELECT * FROM messages WHERE "senderId" = $1 OR "recipientId" = $1 ORDER BY "createdAt" DESC',
      [userId]
    );
    return result.rows;
  }

  // Abonnements
  async createSubscription(subscriptionData) {
    const { userId, stripeId, status } = subscriptionData;
    const result = await this.client.query(
      'INSERT INTO subscriptions ("userId", "stripeId", status) VALUES ($1, $2, $3) RETURNING *',
      [userId, stripeId, status]
    );
    return result.rows[0];
  }

  async updateSubscription(userId, subscriptionData) {
    const fields = Object.keys(subscriptionData);
    const values = Object.values(subscriptionData);
    values.push(userId);
    
    const setClause = fields.map((f, i) => '"' + f + '" = $' + (i + 1)).join(', ');
    const query = \`UPDATE subscriptions SET \${setClause}, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $\${fields.length + 1} RETURNING *\`;
    
    const result = await this.client.query(query, values);
    return result.rows[0];
  }
}

const db = new Database();

module.exports = { db };`;

  fs.writeFileSync('lib/database-simple.js', databaseModule);
  console.log('✅ Module database-simple.js créé');
}

setupPostgreSQLSimple();
