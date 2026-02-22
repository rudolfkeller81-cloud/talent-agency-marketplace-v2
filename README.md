# 🎭 Talent & Agency Marketplace

**Plateforme de mise en relation entre talents et agences**

---

## 📋 Description

Talent & Agency Marketplace est une plateforme web moderne qui permet aux talents (influenceurs, créateurs de contenu privée) de se connecter avec des agences de marketing et de talent. Les talents peuvent créer leur profil, et les agences peuvent découvrir et collaborer avec les meilleurs talents.

### 🎯 Fonctionnalités principales

#### **Pour les Talents**
- ✅ **Profil personnalisé** avec bio, statistiques, et portfolio
- ✅ **Upload de médias** (images, vidéos)
- ✅ **Posts et publications** pour showcase leur travail
- ✅ **Statistiques détaillées** (followers, engagement, revenus)
- ✅ **Gestion des préférences** et paramètres de confidentialité
- ✅ **Export des données** personnelles

#### **Pour les Agences**
- ✅ **Dashboard de gestion** avec analytics
- ✅ **Découverte de talents** avec filtres avancés
- ✅ **Gestion de roster** et collaborations
- ✅ **Abonnements premium** avec fonctionnalités étendues
- ✅ **Reporting et statistiques** avancées

#### **Fonctionnalités Communes**
- ✅ **Système d'authentification** sécurisé
- ✅ **Inscription multi-rôles** (Talent/Agency)
- ✅ **Settings complets** avec gestion du compte
- ✅ **Design responsive** et moderne
- ✅ **API RESTful** pour les intégrations

---

## 🚀 Quick Start

### Prérequis

- **Node.js** >= 18.0.0
- **npm** ou **yarn**
- **Git**

### Installation locale

```bash
# Cloner le projet
git clone <repository-url>
cd windsurf-project

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start
```

Le serveur sera disponible sur `http://localhost:3001`

---

## 📁 Structure du projet

```
windsurf-project/
├── 📄 server.js                 # Serveur principal Express
├── 📄 package.json              # Dépendances et scripts
├── 📄 render.yaml               # Configuration Render (déploiement)
├── 📄 db.js                     # Couche d'abstraction DB
├── 📄 logger.js                 # Système de logs
├── 📁 pages/                    # Pages HTML principales
│   ├── 📄 index.html            # Page d'accueil
│   ├── 📄 signup.html           # Inscription
│   ├── 📄 login.html            # Connexion
│   ├── 📄 discover.html         # Découverte de talents
│   ├── 📄 profile.html          # Profil utilisateur
│   ├── 📄 settings.html         # Paramètres
│   └── 📄 dashboard.html        # Dashboard agences
├── 📁 core/                     # Cœur de l'application
│   └── 📄 asset-manager.js      # Gestion des assets
├── 📁 uploads/                  # Uploads de fichiers
├── 📁 logs/                     # Logs de l'application
└── 📁 node_modules/             # Dépendances
```

---

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Environnement
NODE_ENV=development

# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/talent_agency
# Ou pour le développement local :
# DB_PATH=./database.sqlite

# Authentification
JWT_SECRET=votre_jwt_secret_très_long_et_sécurisé
SESSION_SECRET=votre_session_secret

# Stripe (paiements)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_CLIENT_ID=votre_google_client_id

# Cloudinary (uploads)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# SendGrid (emails)
SENDGRID_API_KEY=SG.votre_api_key

# Production
PRODUCTION_URL=https://votre-domaine.com
ALLOWED_ORIGINS=https://votre-domaine.com
```

### Configuration de la base de données

#### **Développement (SQLite)**
```bash
# SQLite est utilisé par défaut en développement
# Le fichier database.sqlite sera créé automatiquement
```

#### **Production (PostgreSQL)**
```bash
# PostgreSQL est utilisé automatiquement si DATABASE_URL est fourni
# Render fournit une base PostgreSQL gratuite
```

---

## 🌐 Déploiement

### Déploiement sur Render

1. **Forker** le projet sur GitHub
2. **Connecter** GitHub à Render
3. **Créer** un "Web Service" avec :
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
4. **Configurer** les variables d'environnement
5. **Déployer** automatiquement

#### Configuration Render (render.yaml)

Le projet inclut un fichier `render.yaml` pour un déploiement automatique :

```yaml
databases:
  - name: talent-agency-db
    plan: free

services:
  - type: web
    name: talent-agency-app
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    healthCheckPath: /
```

### Déploiement manuel

```bash
# Build pour production
npm install --production

# Démarrer en mode production
NODE_ENV=production node server.js
```

---

## 📚 API Documentation

### Endpoints principaux

#### **Authentification**
```
POST /api/register          # Inscription
POST /api/login             # Connexion
POST /api/logout            # Déconnexion
GET  /api/profile           # Profil utilisateur
PUT  /api/profile           # Mettre à jour profil
```

#### **Talents**
```
GET  /api/talents           # Lister les talents
GET  /api/talents/:id       # Détails d'un talent
POST /api/talents/:id/posts # Créer un post
GET  /api/talents/:id/posts # Posts d'un talent
```

#### **Agences**
```
GET  /api/agencies          # Lister les agences
GET  /api/agencies/:id      # Détails d'une agence
POST /api/agencies/:id/roster # Ajouter au roster
```

#### **Uploads**
```
POST /api/upload            # Upload fichier
GET  /api/uploads/:id       # Télécharger fichier
```

### Réponses API

```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie"
}
```

---

## 🧪 Tests

### Tests manuels

```bash
# Test des endpoints
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test de l'upload
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test.jpg"
```

### Tests automatisés

*(À implémenter avec Jest)*

```bash
npm test                    # Lancer tous les tests
npm run test:unit          # Tests unitaires
npm run test:integration   # Tests d'intégration
```

---

## 🔒 Sécurité

### Mesures de sécurité implémentées

- ✅ **Helmet.js** - Protection des headers HTTP
- ✅ **CORS** - Contrôle des origines autorisées
- ✅ **Rate Limiting** - Limitation des requêtes
- ✅ **JWT Tokens** - Authentification sécurisée
- ✅ **bcrypt** - Hashage des mots de passe
- ✅ **XSS Protection** - Nettoyage des inputs
- ✅ **HTTPS** - Connexions sécurisées en production

### Bonnes pratiques

- 🔐 **Variables d'environnement** - Jamais de secrets en dur
- 🔐 **Validation des inputs** - Tous les données sont validées
- 🔐 **Logs structurés** - Traçabilité des actions
- 🔐 **Health checks** - Monitoring de l'application

---

## 📊 Monitoring & Logs

### Logs

Les logs sont automatiquement créés dans `logs/app.log` :

```bash
# Voir les logs en temps réel
tail -f logs/app.log

# Logs par niveau
grep "ERROR" logs/app.log
grep "INFO" logs/app.log
```

### Health Check

```bash
# Vérifier l'état de l'application
curl http://localhost:3001/health

# Réponse attendue
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

---

## 🤝 Contribuer

### Workflow de développement

1. **Forker** le projet
2. **Créer** une branche `feature/nouvelle-fonctionnalité`
3. **Développer** et tester
4. **Commiter** avec des messages clairs
5. **Pusher** la branche
6. **Créer** une Pull Request

### Conventions de code

- **JavaScript** : ES6+ avec ESLint
- **HTML** : Sémantique et accessible
- **CSS** : Tailwind CSS + styles personnalisés
- **Commits** : Conventional Commits

---

## 📝 License

Ce projet est sous license **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🆘 Support

### Ressources

- 📧 **Email** : support@talent-agency.com
- 📖 **Documentation** : [Wiki du projet](https://github.com/votre-repo/wiki)
- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-repo/issues)

### FAQ

**Q : Comment ajouter un nouveau type de talent ?**
R : Modifier le schéma de la base de données et les formulaires d'inscription.

**Q : Comment configurer les paiements Stripe ?**
R : Ajouter vos clés Stripe dans les variables d'environnement.

**Q : Comment déployer sur un autre hébergeur ?**
R : Le projet est compatible avec n'importe quel hébergeur Node.js.

---

## 🎉 Roadmap

### Version 1.1 (Prochaine)
- [ ] Tests automatisés
- [ ] API documentation complète
- [ ] Notifications push
- [ ] Chat intégré

### Version 1.2 (Futur)
- [ ] Application mobile
- [ ] Analytics avancés
- [ ] Intégrations tierces
- [ ] Marketplace de projets

---

## 📊 Statistiques du projet

- **📁 Fichiers** : 50+ fichiers
- **📦 Dépendances** : 20+ packages
- **🧪 Tests** : À implémenter
- **📚 Documentation** : Complète
- **🚀 Production** : Prêt

---

**Développé avec ❤️ pour la communauté créative**

*Made with [Node.js](https://nodejs.org) • [Express](https://expressjs.com) • [Tailwind CSS](https://tailwindcss.com)*
