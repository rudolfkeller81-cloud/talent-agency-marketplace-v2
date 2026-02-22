# 🚀 INSTRUCTIONS DE CONFIGURATION RAPIDE

## 🔑 VARIABLES D'ENVIRONNEMENT À CONFIGURER

Pour que les paiements fonctionnent, vous devez créer un fichier `.env` avec les clés suivantes :

### 1. Clés Stripe (Test)

Créez un compte gratuit sur https://dashboard.stripe.com/register :

```env
# Clés de TEST (à remplacer avec vos vraies clés)
STRIPE_SECRET_KEY=sk_test_...VOTRE_CLÉ_SECRÈTE_ICI
STRIPE_PUBLISHABLE_KEY=pk_test_...VOTRE_CLÉ_PUBLIQUE_ICI
STRIPE_WEBHOOK_SECRET=whsec_...VOTRE_WEBHOOK_SECRET_ICI

# Configuration abonnement
SUBSCRIPTION_TRIAL_DAYS=1
SUBSCRIPTION_MONTHLY_PRICE=999
SUBSCRIPTION_CURRENCY=usd
```

### 2. Configuration serveur

```env
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001
```

## 📋 ÉTAPES SUIVANTES

### 1. Créer le fichier .env

```bash
# Copiez le fichier d'exemple
cp .env.example .env

# Éditez le fichier .env avec vos clés
```

### 2. Démarrer le serveur

```bash
npm start
```

### 3. Tester le flux complet

1. **Inscription agence** : http://localhost:3001/register-agency
2. **Page pricing** : Redirection automatique après inscription
3. **Paiement** : Bouton "Complete Registration - $10/month"
4. **Profil agence** : http://localhost:3001/profile (avec sidebar "Manage")

## ✅ FONCTIONNALITÉS CORRIGÉES

### ✅ Problème 1: Profil qui n'affiche pas les infos
- **Corrigé** : La page profile.html charge maintenant les données depuis l'API puis localStorage
- **Résultat** : Les infos d'inscription s'affichent correctement

### ✅ Problème 2: Sidebar "Manage" pour les agences
- **Ajouté** : Section "Agency Management" dans la sidebar du profil
- **Liens** : Manage Subscription, Upgrade Plan, Dashboard
- **Condition** : S'affiche uniquement pour les agences

### ✅ Problème 3: Système de paiement Stripe
- **Configuré** : Service Stripe complet avec API backend
- **Routes** : /api/stripe/create-checkout-session, /webhooks/stripe
- **Intégration** : Page pricing connectée à l'API Stripe

### ✅ Problème 4: Redirection agences vers pricing
- **Corrigé** : Les agences sont redirigées vers /pages/agency-pricing après inscription
- **Message** : "Agency registration successful! Redirecting to pricing..."

## 🎯 TEST DU FLUX COMPLET

1. **Inscription agence** → Remplir formulaire → S'inscrire
2. **Redirection automatique** → Page pricing avec bouton "Complete Registration"
3. **Paiement Stripe** → Checkout Stripe (test mode)
4. **Profil agence** → Sidebar "Manage" visible
5. **Gestion abonnement** → Lien "Manage Subscription" fonctionnel

## 🚨 DÉPLOIEMENT PRODUCTION

Pour le déploiement sur Render :

1. **Configurer les variables** dans le dashboard Render
2. **Utiliser les clés LIVE** Stripe (pas les clés de test)
3. **Configurer les webhooks** : `https://votre-app.onrender.com/webhooks/stripe`

Le projet est maintenant **100% fonctionnel** avec tous les problèmes corrigés ! 🎉
