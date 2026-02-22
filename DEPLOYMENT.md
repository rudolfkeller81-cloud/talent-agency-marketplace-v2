# 🚀 GUIDE DE DÉPLOIEMENT RAPIDE

## 📋 PRÉ-REQUIS

- **Node.js** >= 18.0.0
- **Git** installé
- **Compte Render** (gratuit)
- **Compte GitHub** (gratuit)

---

## ⚡ DÉPLOIEMENT AUTOMATIQUE (RECOMMANDÉ)

### Étape 1: Préparer le projet

```bash
# 1. Cloner ou mettre à jour le projet
git pull origin main

# 2. Lancer le script de déploiement
# Windows:
deploy.bat

# Linux/Mac:
./deploy.sh
```

### Étape 2: Déployer sur Render

1. **Connecter GitHub à Render**
   - Aller sur https://render.com
   - "New" → "Web Service"
   - "Connect GitHub repository"

2. **Configurer le service**
   - Sélectionner ton repository
   - Render détectera automatiquement `render.yaml`
   - Cliquer sur "Create Web Service"

3. **Attendre le déploiement**
   - Render va builder et déployer automatiquement
   - Le site sera disponible sur `https://ton-app.onrender.com`

---

## 🔧 DÉPLOIEMENT MANUEL

### Option A: Déploiement Local

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier .env
copy .env.example .env

# 3. Démarrer le serveur
npm start

# 4. Accéder à l'application
# http://localhost:3001
```

### Option B: Déploiement Render Manuel

1. **Créer un compte Render**
2. **Créer une base PostgreSQL**
   - "New" → "PostgreSQL"
   - Plan: Free
   - Nom: `talent-agency-db`

3. **Créer le service web**
   - "New" → "Web Service"
   - Runtime: Node
   - Build: `npm install`
   - Start: `node server.js`
   - Health Check: `/health`

4. **Configurer les variables**
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (fourni par Render)
   - `JWT_SECRET`: (généré automatiquement)

---

## 🔑 CONFIGURATION OBLIGATOIRE

### Variables à configurer sur Render:

1. **Stripe** (pour les paiements)
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Cloudinary** (pour les uploads)
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

3. **Google OAuth** (optionnel)
   ```
   GOOGLE_CLIENT_ID=...
   ```

---

## 🧪 TESTS DE DÉPLOIEMENT

### Vérifier le health check

```bash
curl https://ton-app.onrender.com/health
```

Réponse attendue:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "uploads": "available",
    "logs": "available"
  }
}
```

### Tester les fonctionnalités

1. **Inscription**: `https://ton-app.onrender.com/signup`
2. **Login**: `https://ton-app.onrender.com/login`
3. **Dashboard**: `https://ton-app.onrender.com/dashboard`
4. **Settings**: `https://ton-app.onrender.com/settings`

---

## 🚨 DÉPANNAGE

### Problèmes courants:

#### **Le serveur ne démarre pas**
```bash
# Vérifier les logs sur Render
# Onglet "Logs" dans le dashboard Render

# Vérifier localement
npm run logs
```

#### **Erreur de base de données**
```bash
# Vérifier DATABASE_URL
# S'assurer que PostgreSQL est bien configuré
```

#### **CORS errors**
```bash
# Vérifier ALLOWED_ORIGINS
# Doit inclure l'URL de production
```

#### **Uploads ne fonctionnent pas**
```bash
# Configurer Cloudinary en production
# Les fichiers locaux ne persistent pas sur Render
```

---

## 📊 MONITORING

### Health check automatique
- Render vérifie `/health` toutes les 30 secondes
- Redémarrage automatique en cas d'échec

### Logs
- **Production**: Logs Render dans le dashboard
- **Local**: `npm run logs`

### Métriques
- **Uptime**: Disponible dans le dashboard Render
- **Performance**: Via `/health` endpoint

---

## 🔄 MISES À JOUR

### Déploiement automatique
```bash
git push origin main
# Render déploie automatiquement
```

### Déploiement manuel
1. **Push sur GitHub**
2. **"Manual Deploy"** dans Render
3. **Attendre** le déploiement

---

## 🎯 CHECKLIST PRODUCTION

- [ ] **Render.yaml** configuré
- [ ] **Variables d'environnement** configurées
- [ ] **Health check** fonctionnel
- [ ] **Stripe** configuré (si paiements)
- [ ] **Cloudinary** configuré (si uploads)
- [ ] **HTTPS** activé (automatique Render)
- [ ] **Domaine** configuré (optionnel)
- [ ] **Monitoring** activé

---

## 🆘 SUPPORT

### Liens utiles:
- **Dashboard Render**: https://dashboard.render.com
- **Documentation**: https://render.com/docs
- **Status**: https://status.render.com

### Commandes utiles:
```bash
# Redémarrer le service local
taskkill /F /IM node.exe && npm start

# Vérifier les ports
netstat -an | findstr 3001

# Nettoyer le projet
npm run clean
```

---

## ✅ RÉSUMÉ

1. **Préparer** le projet avec `deploy.bat`
2. **Connecter** GitHub à Render
3. **Configurer** les variables essentielles
4. **Déployer** automatiquement
5. **Tester** les fonctionnalités
6. **Monitorer** avec le health check

**Le projet est maintenant prêt pour la production !** 🚀
