const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Test de connexion
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Connexion à PostgreSQL réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à PostgreSQL:', error);
    return false;
  }
}

// Fonctions utilitaires pour la base de données
const db = {
  // Utilisateurs
  async createUser(userData) {
    return await prisma.user.create({
      data: userData,
      include: { profile: true }
    });
  },

  async getUserByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: { profile: true, subscription: true }
    });
  },

  async getUserById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: { profile: true, subscription: true }
    });
  },

  // Profils
  async createProfile(profileData) {
    return await prisma.profile.create({
      data: profileData,
      include: { user: true }
    });
  },

  async updateProfile(userId, profileData) {
    return await prisma.profile.update({
      where: { userId },
      data: profileData,
      include: { user: true }
    });
  },

  async getProfiles(type = null) {
    const where = type ? { user: { userType: type } } : {};
    return await prisma.profile.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Messages
  async createMessage(messageData) {
    return await prisma.message.create({
      data: messageData,
      include: { sender: true, recipient: true }
    });
  },

  async getMessages(userId) {
    return await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId }
        ]
      },
      include: { sender: true, recipient: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Abonnements
  async createSubscription(subscriptionData) {
    return await prisma.subscription.create({
      data: subscriptionData,
      include: { user: true }
    });
  },

  async updateSubscription(userId, subscriptionData) {
    return await prisma.subscription.update({
      where: { userId },
      data: subscriptionData,
      include: { user: true }
    });
  },

  // Favoris
  async addFavorite(userId, profileId) {
    return await prisma.favorite.create({
      data: { userId, profileId },
      include: { user: true }
    });
  },

  async removeFavorite(userId, profileId) {
    return await prisma.favorite.deleteMany({
      where: { userId, profileId }
    });
  },

  async getFavorites(userId) {
    return await prisma.favorite.findMany({
      where: { userId },
      include: { user: true }
    });
  },

  // Fermeture propre
  async disconnect() {
    await prisma.$disconnect();
  }
};

module.exports = { prisma, db, testConnection };
