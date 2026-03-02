# 🚀 CHECKLIST DÉPLOIEMENT PRODUCTION

## 📋 ÉTAPES OBLIGATOIRES

### 1. Créer les comptes services externes

#### Stripe (Paiements)
- [ ] Créer compte sur https://dashboard.stripe.com
- [ ] Récupérer les clés de test : `sk_test_...` et `pk_test_...`
- [ ] Configurer les webhooks : `/webhooks/stripe`
- [ ] Noter les clés pour Render

#### Cloudinary (Uploads)
- [ ] Créer compte gratuit sur https://cloudinary.com
- [ ] Récupérer : Cloud Name, API Key, API Secret
- [ ] Noter les identifiants pour Render

### 2. Déployer sur Render

#### Étape A: Préparation GitHub
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

#### Étape B: Configuration Render
1. **Connecter GitHub** à Render
2. **Créer PostgreSQL** :
   - "New" → "PostgreSQL"
   - Plan: Free
   - Nom: `talent-agency-db`
3. **Créer Web Service** :
   - "New" → "Web Service"
   - Connecter votre repository GitHub
   - Render détectera `render.yaml`
   - Cliquer "Create Web Service"

### 3. Configurer variables d'environnement sur Render

Dans le dashboard Render → votre service → Environment :

#### URL Production (remplacer avec votre vraie URL)
```
PRODUCTION_URL=https://votre-app.onrender.com
BASE_URL=https://votre-app.onrender.com
ALLOWED_ORIGINS=https://votre-app.onrender.com
```

#### Stripe (remplacer avec vos vraies clés)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Cloudinary (remplacer avec vos vrais identifiants)
```
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

#### Google OAuth (optionnel)
```
GOOGLE_CLIENT_ID=votre_google_client_id
```

### 4. Tests de déploiement

#### Health Check
```bash
curl https://votre-app.onrender.com/health
```

#### Tests fonctionnels
- [ ] Inscription : `https://votre-app.onrender.com/signup`
- [ ] Login : `https://votre-app.onrender.com/login`
- [ ] Dashboard : `https://votre-app.onrender.com/dashboard`
- [ ] Upload avatar : tester l'upload avec Cloudinary
- [ ] Paiement : tester l'abonnement agency

## 🚨 PROBLÈMES COURANTS ET SOLUTIONS

### Erreur "Database connection failed"
- Vérifier que `DATABASE_URL` est bien connecté à la base Render
- Redémarrer le service si nécessaire

### Erreur "CORS"
- Vérifier `ALLOWED_ORIGINS` contient bien votre URL production
- Pas de slash à la fin de l'URL

### Uploads ne fonctionnent pas
- Configurer Cloudinary (obligatoire sur Render)
- Les fichiers locaux ne persistent pas sur Render

### Stripe ne fonctionne pas
- Vérifier les clés sont correctes
- Configurer les webhooks dans le dashboard Stripe

## ✅ VALIDATION PRODUCTION

- [ ] Site accessible sur HTTPS
- [ ] Health check retourne "healthy"
- [ ] Inscription/login fonctionnels
- [ ] Uploads fonctionnent avec Cloudinary
- [ ] Pages s'affichent correctement
- [ ] Pas d'erreurs dans les logs Render

## 🔄 MAINTENANCE

### Monitoring
- Health check automatique toutes les 30s
- Logs disponibles dans le dashboard Render
- Redémarrage automatique en cas d'échec

### Mises à jour
```bash
git push origin main
# Render déploie automatiquement
```

## 🎯 RÉSUMÉ RAPIDE

1. **Créer comptes** Stripe + Cloudinary
2. **Push sur GitHub**
3. **Déployer sur Render** (PostgreSQL + Web Service)
4. **Configurer variables** environnement
5. **Tester** toutes les fonctionnalités

**Votre site sera en production !** 🚀
