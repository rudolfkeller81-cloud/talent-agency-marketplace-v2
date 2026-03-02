const { supabase } = require('./lib/supabase');

// Script pour créer les tables automatiquement
async function createTablesAutomatically() {
  console.log('🚀 Création automatique des tables Supabase...');
  
  try {
    // Créer la table users avec SQL
    console.log('🔨 Création table users...');
    
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          userType TEXT NOT NULL CHECK (userType IN ('TALENT', 'AGENCY')),
          createdAt TIMESTAMP DEFAULT NOW(),
          updatedAt TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          userId UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          bio TEXT,
          location TEXT,
          avatarUrl TEXT,
          verified BOOLEAN DEFAULT FALSE,
          stageName TEXT,
          age TEXT,
          skills TEXT[],
          experience TEXT,
          rates JSONB,
          availability TEXT,
          socialMedia JSONB,
          companyName TEXT,
          website TEXT,
          phone TEXT,
          founded TEXT,
          teamSize TEXT,
          specialization TEXT[],
          createdAt TIMESTAMP DEFAULT NOW(),
          updatedAt TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          senderId UUID NOT NULL REFERENCES users(id),
          recipientId UUID NOT NULL REFERENCES users(id),
          content TEXT NOT NULL,
          isRead BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS favorites (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          profileId UUID NOT NULL,
          createdAt TIMESTAMP DEFAULT NOW(),
          UNIQUE(userId, profileId)
        );
        
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          userId UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          stripeId TEXT UNIQUE,
          status TEXT DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'CANCELED', 'EXPIRED')),
          currentPeriodStart TIMESTAMP,
          currentPeriodEnd TIMESTAMP,
          trialEnd TIMESTAMP,
          createdAt TIMESTAMP DEFAULT NOW(),
          updatedAt TIMESTAMP DEFAULT NOW()
        );
      `
    });
    
    if (usersError) {
      console.log('ℹ️ Erreur SQL (normal si RPC non activé)');
      console.log('💡 Utilise linterface web à la place');
    } else {
      console.log('✅ Tables créées automatiquement !');
    }
    
    // Test simple
    console.log('🔍 Test de lecture...');
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.log('❌ Les tables nexistent pas encore');
      console.log('💡 Utilise linterface web (voir GUIDE)');
    } else {
      console.log('✅ Tables créées avec succès !');
      console.log(`📋 Utilisateurs: ${data?.[0]?.count || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('💡 Utilise linterface web - cest plus simple !');
  }
}

createTablesAutomatically();
