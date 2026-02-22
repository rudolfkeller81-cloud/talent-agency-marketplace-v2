const { createClient } = require('@supabase/supabase-js');

// 🔥 REMPLACE CES DEUX LIGNES AVEC TES INFOS SUPABASE :
// 1. Va sur ton projet Supabase > Settings > API
// 2. Copie "Project URL" et "anon public key"

const supabaseUrl = 'https://adatnocjymeylvbypvah.supabase.co';     // ← REMPLACE CETTE LIGNE
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkYXRub2NqeW1leWx2YnlwdmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzY1MjMsImV4cCI6MjA4NjIxMjUyM30.dk57-_2sObp84jkA0x_dY5mpKov1x_oXhw5Cs-yPtlc';                     // ← REMPLACE CETTE LIGNE

const supabase = createClient(supabaseUrl, supabaseKey);

// Test de connexion et configuration
async function setupSupabase() {
  console.log('🚀 Configuration Supabase pour Talent & Agency...');
  
  try {
    // Test de connexion
    console.log('🔍 Test de connexion Supabase...');
    const { data, error } = await supabase.from('profiles').select('count');
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (normal)
      console.error('❌ Erreur de connexion:', error);
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie !');
    
    // Créer les tables via SQL
    console.log('🔨 Création des tables...');
    
    // Table users
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          userType TEXT NOT NULL CHECK (userType IN ('TALENT', 'AGENCY')),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          userId TEXT UNIQUE NOT NULL,
          bio TEXT,
          location TEXT,
          avatarUrl TEXT,
          verified BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Champs talents
          stageName TEXT,
          age TEXT,
          skills TEXT[],
          experience TEXT,
          rates JSONB,
          availability TEXT,
          socialMedia JSONB,
          
          -- Champs agences
          companyName TEXT,
          website TEXT,
          phone TEXT,
          founded TEXT,
          teamSize TEXT,
          specialization TEXT[],
          
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          senderId TEXT NOT NULL,
          recipientId TEXT NOT NULL,
          content TEXT NOT NULL,
          isRead BOOLEAN DEFAULT FALSE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (senderId) REFERENCES users(id),
          FOREIGN KEY (recipientId) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          userId TEXT NOT NULL,
          profileId TEXT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(userId, profileId)
        );
        
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          userId TEXT UNIQUE NOT NULL,
          stripeId TEXT UNIQUE,
          status TEXT DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'CANCELED', 'EXPIRED')),
          currentPeriodStart TIMESTAMP,
          currentPeriodEnd TIMESTAMP,
          trialEnd TIMESTAMP,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `
    });
    
    if (usersError) {
      console.log('ℹ️ Tables existent déjà ou créées via linterface');
    } else {
      console.log('✅ Tables créées avec succès !');
    }
    
    // Test d'insertion
    console.log('📝 Test dinsertion...');
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: 'test@talent-agency.com',
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
        userType: 'TALENT'
      })
      .select()
      .single();
    
    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('❌ Erreur insertion:', insertError);
    } else {
      console.log('✅ Utilisateur de test créé/existe déjà');
    }
    
    // Vérification finale
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, userType')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Erreur lecture:', fetchError);
    } else {
      console.log(`📋 Utilisateurs dans la base: ${users.length}`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.userType})`);
      });
    }
    
    console.log('🎉 Supabase est 100% prêt !');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

module.exports = { supabase, setupSupabase };
