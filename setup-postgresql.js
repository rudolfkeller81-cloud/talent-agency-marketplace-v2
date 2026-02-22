const { execSync } = require('child_process');
const fs = require('fs');

// Script pour configurer PostgreSQL avec Prisma
async function setupPostgreSQL() {
  console.log('🚀 Configuration de PostgreSQL pour Talent & Agency...');
  
  try {
    // 1. Créer le fichier .env.local avec la connexion PostgreSQL
    const envContent = `DATABASE_URL="postgresql://postgres:password@localhost:5432/talent_agency?schema=public"
JWT_SECRET="talent-agency-jwt-secret-2024"
NEXTAUTH_SECRET="talent-agency-secret-key-2024"`;
    
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Fichier .env.local créé');
    
    // 2. Ajouter la datasource URL temporairement dans le schema
    const schemaPath = 'prisma/schema.prisma';
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Remplacer la datasource sans URL par une avec URL
    schemaContent = schemaContent.replace(
      'datasource db {\n  provider = "postgresql"\n}',
      'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}'
    );
    
    fs.writeFileSync(schemaPath, schemaContent);
    console.log('✅ Schema Prisma mis à jour');
    
    // 3. Générer le client Prisma
    console.log('🔍 Génération du client Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // 4. Pousser le schéma vers PostgreSQL (crée les tables)
    console.log('🔍 Création des tables dans PostgreSQL...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    // 5. Test de connexion
    console.log('🔍 Test de connexion...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('✅ Connexion à PostgreSQL réussie !');
    
    // Test créer un utilisateur
    const testUser = await prisma.user.create({
      data: {
        email: 'test@talent-agency.com',
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
        userType: 'TALENT'
      }
    });
    
    console.log('✅ Utilisateur de test créé:', testUser.email);
    
    // Vérifier les tables
    const userCount = await prisma.user.count();
    console.log(`📋 Nombre d'utilisateurs: ${userCount}`);
    
    await prisma.$disconnect();
    console.log('🎉 PostgreSQL est prêt !');
    
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
      console.log('   Vérifie dans Services Windows que PostgreSQL tourne');
    }
  }
}

setupPostgreSQL();
