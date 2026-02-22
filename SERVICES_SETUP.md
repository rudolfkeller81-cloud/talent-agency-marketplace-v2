# 🔧 GUIDE DE CONFIGURATION DES SERVICES

## 📋 INTRODUCTION

Ce guide explique comment configurer les services essentiels pour la production : **SendGrid** (emails) et **Stripe** (paiements pour agences).

---

## 📧 **CONFIGURATION SENDGRID - EMAILS**

### Étape 1: Créer un compte SendGrid

1. **Inscription**
   - Va sur https://signup.sendgrid.com
   - Crée un compte gratuit (100 emails/jour gratuits)

2. **Vérification du compte**
   - Vérifie ton adresse email
   - Complète ton profil

### Étape 2: Configurer l'API Key

1. **Créer une API Key**
   - Dashboard → Settings → API Keys
   - "Create API Key"
   - Nom: "Talent Agency Production"
   - Permissions: "Full Access"
   - Copie la clé (commence par `SG.`)

2. **Configurer le Sender Identity**
   - Dashboard → Settings → Sender Authentication
   - "Authenticate Your Domain" OU "Verify a Single Sender"
   - Pour le développement: "Verify a Single Sender"
   - Ajoute ton email et vérifie-le

### Étape 3: Configurer le projet

1. **Mettre à jour .env**
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=noreply@talent-agency.com
   EMAIL_FROM_NAME="Talent & Agency Marketplace"
   ```

2. **Tester les emails**
   ```bash
   # Test d'envoi d'email
   curl -X POST http://localhost:3001/api/services/email/test \
     -H "Content-Type: application/json" \
     -d '{"email":"ton@email.com","name":"Ton Nom"}'
   ```

---

## 💳 **CONFIGURATION STRIPE - ABONNEMENTS AGENCES**

### Étape 1: Créer un compte Stripe

1. **Inscription**
   - Va sur https://dashboard.stripe.com/register
   - Crée un compte (gratuit)

2. **Configuration du business**
   - Remplis les informations de ton entreprise
   - Configure les préférences de paiement

### Étape 2: Configurer les produits et prix

1. **Créer le produit Agency Pro**
   - Dashboard → Products → "Add product"
   - Nom: "Agency Pro"
   - Description: "Accès illimité aux talents et analytics avancés"
   - Type: "Service"

2. **Créer le prix**
   - Dans le produit, clique "Add pricing"
   - Prix: 299.00€
   - Période: "Monthly"
   - Essai gratuit: 3 jours

### Étape 3: Configurer les API Keys

1. **Récupérer les clés**
   - Dashboard → Developers → API keys
   - Copie la clé "Secret key" (commence par `sk_test_`)
   - Copie la clé "Publishable key" (commence par `pk_test_`)

2. **Configurer le webhook**
   - Dashboard → Developers → Webhooks
   - "Add endpoint"
   - URL: `https://ton-domaine.com/api/services/stripe/webhook`
   - Événements à écouter:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copie le "Signing Secret" (commence par `whsec_`)

### Étape 4: Configurer le projet

1. **Mettre à jour .env**
   ```env
   STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqrstuvwx
   STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnopqrstuvwx
   STRIPE_WEBHOOK_SECRET=whsec_51234567890abcdefghijklmnopqrstuvwx
   
   SUBSCRIPTION_TRIAL_DAYS=3
   SUBSCRIPTION_MONTHLY_PRICE=29900
   SUBSCRIPTION_CURRENCY=eur
   ```

2. **Tester Stripe**
   ```bash
   # Vérifier le statut des services
   curl http://localhost:3001/api/services/status
   ```

---

## 🚀 **DÉPLOIEMENT EN PRODUCTION**

### Étape 1: Passer en mode production

1. **Mettre à jour les clés**
   - Remplace les clés de test par les clés live
   - `sk_test_...` → `sk_live_...`
   - `pk_test_...` → `pk_live_...`

2. **Configurer les URLs**
   ```env
   BASE_URL=https://ton-domaine.com
   STRIPE_SUCCESS_URL=https://ton-domaine.com/settings?subscription=success
   STRIPE_CANCEL_URL=https://ton-domaine.com/settings?subscription=cancel
   STRIPE_WEBHOOK_URL=https://ton-domaine.com/api/services/stripe/webhook
   ```

### Étape 2: Configurer Render

1. **Variables d'environnement**
   - Ajoute toutes les clés dans Render
   - Ne jamais mettre de clés de test en production

2. **Webhooks Stripe**
   - Met à jour l'URL du webhook vers ton domaine Render
   - Teste le webhook avec le bouton "Send test webhook"

---

## 🧪 **TESTS ET VALIDATION**

### Tester SendGrid

```bash
# 1. Test email de bienvenue
curl -X POST http://localhost:3001/api/services/email/welcome \
  -H "Authorization: Bearer TON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","role":"talent"}'

# 2. Vérifie les logs
npm run logs
```

### Tester Stripe

```bash
# 1. Créer un customer
curl -X POST http://localhost:3001/api/services/stripe/customer \
  -H "Authorization: Bearer TON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"123","email":"test@example.com","name":"Test User"}'

# 2. Vérifier le statut
curl http://localhost:3001/api/services/status
```

---

## 🚨 **DÉPANNAGE**

### SendGrid ne fonctionne pas

1. **Vérifier l'API Key**
   ```bash
   # Test si la clé est valide
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer TA_CLE_API" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"test@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
   ```

2. **Vérifier le Sender Identity**
   - Dashboard → Settings → Sender Authentication
   - Assure-toi que ton email est vérifié

### Stripe ne fonctionne pas

1. **Vérifier les clés**
   - Assure-toi d'utiliser les bonnes clés (test vs live)
   - Vérifie que les clés ne sont pas expirées

2. **Vérifier les webhooks**
   - Dashboard → Developers → Webhooks
   - Teste avec "Send test webhook"
   - Vérifie les logs du serveur

### Erreurs courantes

| Erreur | Solution |
|--------|----------|
| `401 Unauthorized` | Clé API invalide ou expirée |
| `403 Forbidden` | Permissions insuffisantes |
| `429 Too Many Requests` | Trop de requêtes (rate limiting) |
| `500 Server Error` | Problème de configuration serveur |

---

## 📊 **MONITORING**

### SendGrid

1. **Dashboard**
   - Activity → Voir les emails envoyés
   - Settings → Tracking → Configurer les analytics

2. **Metrics**
   - Taux de livraison
   - Taux d'ouverture
   - Taux de clics

### Stripe

1. **Dashboard**
   - Payments → Voir les transactions
   - Customers → Voir les clients
   - Subscriptions → Voir les abonnements

2. **Metrics**
   - Revenus mensuels
   - Taux de conversion
   - Churn rate

---

## ✅ **CHECKLIST FINALE**

- [ ] **SendGrid configuré**
  - [ ] API Key créée et ajoutée à .env
  - [ ] Sender Identity vérifié
  - [ ] Emails de test envoyés avec succès

- [ ] **Stripe configuré**
  - [ ] Clés API créées et ajoutées à .env
  - [ ] Produit "Agency Pro" créé
  - [ ] Prix 299€/mois configuré
  - [ ] Webhook configuré et testé

- [ ] **Production prête**
  - [ ] Clés de test remplacées par clés live
  - [ ] URLs de production configurées
  - [ ] Variables Render ajoutées
  - [ ] Webhooks testés en production

---

## 🎯 **RÉSULTAT FINAL**

Une fois configuré, ton application aura :

✅ **Emails professionnels** avec SendGrid  
✅ **Paiements sécurisés** avec Stripe  
✅ **Abonnements agences** à 299€/mois  
✅ **Webhooks** pour les notifications  
✅ **Monitoring** des deux services  

**Ton application sera 100% production-ready !** 🚀
