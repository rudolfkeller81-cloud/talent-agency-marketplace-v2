const { execSync } = require('child_process');
const fs = require('fs');

// Configuration PostgreSQL pour Prisma 7
async function setupPostgreSQLDirect() {
  console.log('🚀 Configuration PostgreSQL directe...');
  
  try {
    // 1. Créer le fichier .env.local
    const envContent = `DATABASE_URL="postgresql://postgres:password@localhost:5432/talent_agency?schema=public"`;
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ .env.local créé');
    
    // 2. Utiliser le schema sans datasource URL
    const schemaContent = `// This is your Prisma schema file,
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  firstName String
  lastName  String
  userType  UserType
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile     Profile?
  subscription Subscription?
  sentMessages    Message[] @relation("SentMessages")
  receivedMessages Message[] @relation("ReceivedMessages")
  favorites   Favorite[]
  
  @@map("users")
}

model Profile {
  id            String   @id @default(cuid())
  userId        String   @unique
  
  bio           String?
  location      String?
  avatarUrl     String?
  verified      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  stageName     String?
  age           String?
  skills        String[]
  experience    String?
  rates         Json?
  availability  String?
  socialMedia   Json?
  
  companyName   String?
  website        String?
  phone         String?
  founded       String?
  teamSize      String?
  specialization String[]
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("profiles")
}

model Message {
  id           String   @id @default(cuid())
  senderId     String
  recipientId  String
  content      String
  isRead       Boolean  @default(false)
  createdAt    DateTime @default(now())

  sender    User @relation("SentMessages", fields: [senderId], references: [id])
  recipient User @relation("ReceivedMessages", fields: [recipientId], references: [id])
  
  @@map("messages")
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  profileId String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, profileId])
  @@map("favorites")
}

model Subscription {
  id            String   @id @default(cuid())
  userId        String   @unique
  stripeId      String?  @unique
  status        SubscriptionStatus @default(TRIAL)
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  trialEnd      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("subscriptions")
}

enum UserType {
  TALENT
  AGENCY
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  CANCELED
  EXPIRED
}`;
    
    fs.writeFileSync('prisma/schema.prisma', schemaContent);
    console.log('✅ Schema Prisma configuré');
    
    // 3. Générer le client
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Client Prisma généré');
    
    // 4. Test avec le client direct
    const { PrismaClient } = require('@prisma/client');
    
    // Configuration avec adapter pour Prisma 7
    const prisma = new PrismaClient({
      adapter: {
        url: process.env.DATABASE_URL
      }
    });
    
    await prisma.$connect();
    console.log('✅ Connexion PostgreSQL réussie !');
    
    // Créer les tables manuellement avec SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        "userType" TEXT NOT NULL CHECK ("userType" IN ('TALENT', 'AGENCY')),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
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
    `;
    
    console.log('✅ Tables créées avec succès !');
    
    // Test d'insertion
    const testUser = await prisma.$executeRaw`
      INSERT INTO users (id, email, password, firstName, lastName, "userType")
      VALUES ('test-123', 'test@talent-agency.com', 'hashedpassword123', 'Test', 'User', 'TALENT')
      ON CONFLICT (email) DO NOTHING
    `;
    
    console.log('✅ Utilisateur de test créé !');
    
    // Vérification
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
    console.log(`📋 Utilisateurs dans la base: ${count[0].count}`);
    
    await prisma.$disconnect();
    console.log('🎉 PostgreSQL est 100% prêt !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.message.includes('password')) {
      console.log('💡 Vérifie le mot de passe PostgreSQL (devrait être "password")');
    }
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 Crée la base de données:');
      console.log('   1. Ouvre pgAdmin 4');
      console.log('   2. Connecte-toi avec postgres/password');
      console.log('   3. Clic droit > Create > Database');
      console.log('   4. Nom: talent_agency');
    }
    if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 Démarre PostgreSQL:');
      console.log('   1. Services Windows > postgresql-x64-15 > Start');
    }
  }
}

setupPostgreSQLDirect();
