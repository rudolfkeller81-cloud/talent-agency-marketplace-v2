#!/bin/bash

# =============================================================================
# SCRIPT DE DÉPLOIEMENT AUTOMATIQUE - TALENT AGENCY MARKETPLACE
# =============================================================================

set -e  # Arrêter le script en cas d'erreur

echo "🚀 DÉPLOIEMENT - Talent & Agency Marketplace"
echo "=========================================="

# Vérifications pré-déploiement
echo "📋 Vérifications pré-déploiement..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION est trop ancienne (requise: >= $REQUIRED_VERSION)"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION OK"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ npm version $(npm -v) OK"

# Vérifier Git
if ! command -v git &> /dev/null; then
    echo "❌ Git n'est pas installé"
    exit 1
fi

echo "✅ Git version $(git --version | cut -d' ' -f3) OK"

# Nettoyage de l'environnement
echo "🧹 Nettoyage de l'environnement..."

# Supprimer les anciens logs
if [ -d "logs" ]; then
    rm -rf logs/*
    echo "🗑️ Logs supprimés"
fi

# Supprimer les anciens uploads (conservation pour la production)
if [ "$NODE_ENV" != "production" ]; then
    if [ -d "uploads" ]; then
        rm -rf uploads/*
        echo "🗑️ Uploads supprimés (mode développement)"
    fi
fi

# Supprimer la base de données SQLite (développement uniquement)
if [ "$NODE_ENV" != "production" ]; then
    if [ -f "database.sqlite" ]; then
        rm database.sqlite
        echo "🗑️ Base de données SQLite supprimée (mode développement)"
    fi
fi

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm ci --production=false

# Vérification des dépendances critiques
echo "🔍 Vérification des dépendances critiques..."

CRITICAL_DEPS=("express" "cors" "helmet" "bcrypt" "sqlite3" "pg")

for dep in "${CRITICAL_DEPS[@]}"; do
    if ! npm list "$dep" > /dev/null 2>&1; then
        echo "❌ Dépendance critique manquante: $dep"
        exit 1
    fi
done

echo "✅ Toutes les dépendances critiques sont installées"

# Création des dossiers nécessaires
echo "📁 Création des dossiers nécessaires..."

mkdir -p logs
mkdir -p uploads
mkdir -p backups

echo "✅ Dossiers créés"

# Vérification des variables d'environnement
echo "🔧 Vérification des variables d'environnement..."

if [ ! -f ".env" ]; then
    echo "⚠️ Fichier .env manquant"
    echo "📝 Création à partir de .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env créé à partir de .env.example"
        echo "⚠️ N'oubliez pas de modifier les valeurs dans .env !"
    else
        echo "❌ .env.example manquant"
        exit 1
    fi
else
    echo "✅ Fichier .env trouvé"
fi

# Vérification des variables essentielles
ESSENTIAL_VARS=("NODE_ENV" "PORT")

for var in "${ESSENTIAL_VARS[@]}"; do
    if ! grep -q "^$var=" .env; then
        echo "⚠️ Variable $var manquante dans .env"
    fi
done

# Tests de santé (si le serveur est déjà en cours)
if pgrep -f "node server.js" > /dev/null; then
    echo "🏥 Test de santé du serveur existant..."
    
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Serveur existant en bonne santé"
    else
        echo "⚠️ Serveur existant non répondant - redémarrage nécessaire"
        pkill -f "node server.js"
    fi
fi

# Démarrage du serveur
echo "🚀 Démarrage du serveur..."

if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Mode production"
    NODE_ENV=production npm start &
    SERVER_PID=$!
else
    echo "🛠️ Mode développement"
    npm start &
    SERVER_PID=$!
fi

# Attendre que le serveur démarre
echo "⏳ Attente du démarrage du serveur..."
sleep 5

# Test de santé du nouveau serveur
echo "🏥 Test de santé du nouveau serveur..."

MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Serveur démarré avec succès !"
        
        # Afficher les informations de santé
        HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
        echo "📊 État de santé:"
        echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
        
        break
    else
        echo "⏳ Tentative $ATTEMPT/$MAX_ATTEMPTS..."
        sleep 2
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "❌ Le serveur n'a pas pu démarrer correctement"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    exit 1
fi

# Affichage des informations finales
echo ""
echo "🎉 DÉPLOIEMENT RÉUSSI !"
echo "=========================================="
echo "🌐 Serveur: http://localhost:3001"
echo "🏥 Health: http://localhost:3001/health"
echo "📊 Dashboard: http://localhost:3001/dashboard"
echo "👤 Profile: http://localhost:3001/profile"
echo "⚙️ Settings: http://localhost:3001/settings"
echo ""
echo "📝 Logs en temps réel:"
echo "   npm run logs"
echo ""
echo "🔄 Pour redémarrer:"
echo "   pkill -f 'node server.js' && npm start"
echo ""
echo "🧹 Pour nettoyer:"
echo "   npm run clean"
echo ""

if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 MODE PRODUCTION - Ne pas oublier:"
    echo "   - Configurer les variables d'environnement de production"
    echo "   - Mettre en place le monitoring"
    echo "   - Configurer les backups"
    echo "   - Mettre à jour le DNS"
else
    echo "🛠️ MODE DÉVELOPPEMENT - Pour passer en production:"
    echo "   export NODE_ENV=production"
    echo "   npm run prod:start"
fi

echo ""
echo "✨ Bon développement ! ✨"
