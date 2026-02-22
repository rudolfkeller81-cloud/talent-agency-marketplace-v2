// ============================================================================
// ROUTES API - SERVICES STRIPE UNIQUEMENT
// ============================================================================

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const stripeService = require('./stripe-service');

// Middleware pour vérifier l'authentification
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token manquant' });
    }
    // TODO: Vérifier le token JWT ici
    next();
};


// ============================================================================
// ROUTES STRIPE - ABONNEMENTS AGENCES
// ============================================================================

// Créer un client Stripe
router.post('/stripe/customer', requireAuth, async (req, res) => {
    try {
        const { userId, email, name } = req.body;
        
        if (!userId || !email || !name) {
            return res.status(400).json({ 
                success: false, 
                message: 'userId, email et name requis' 
            });
        }

        const customer = await stripeService.createCustomer(userId, email, name);
        
        res.json({ 
            success: true, 
            data: customer,
            message: 'Client Stripe créé avec succès' 
        });
    } catch (error) {
        logger.error('Erreur API stripe customer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création du client' 
        });
    }
});

// Créer une session de checkout pour l'abonnement
router.post('/stripe/checkout', requireAuth, async (req, res) => {
    try {
        const { customerId, priceId } = req.body;
        
        if (!customerId || !priceId) {
            return res.status(400).json({ 
                success: false, 
                message: 'customerId et priceId requis' 
            });
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        const successUrl = process.env.STRIPE_SUCCESS_URL || `${baseUrl}/settings?subscription=success`;
        const cancelUrl = process.env.STRIPE_CANCEL_URL || `${baseUrl}/settings?subscription=cancel`;

        const session = await stripeService.createCheckoutSession(
            customerId, 
            priceId, 
            successUrl, 
            cancelUrl
        );
        
        res.json({ 
            success: true, 
            data: session,
            message: 'Session de checkout créée' 
        });
    } catch (error) {
        logger.error('Erreur API stripe checkout:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création de la session' 
        });
    }
});

// Créer un portail client pour gérer l'abonnement
router.post('/stripe/portal', requireAuth, async (req, res) => {
    try {
        const { customerId } = req.body;
        
        if (!customerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'customerId requis' 
            });
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        const returnUrl = `${baseUrl}/settings`;

        const session = await stripeService.createCustomerPortalSession(customerId, returnUrl);
        
        res.json({ 
            success: true, 
            data: session,
            message: 'Session portail client créée' 
        });
    } catch (error) {
        logger.error('Erreur API stripe portal:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création du portail' 
        });
    }
});

// Obtenir les détails d'un abonnement
router.get('/stripe/subscription/:subscriptionId', requireAuth, async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        
        const subscription = await stripeService.getSubscription(subscriptionId);
        
        res.json({ 
            success: true, 
            data: subscription,
            message: 'Détails de l\'abonnement récupérés' 
        });
    } catch (error) {
        logger.error('Erreur API stripe subscription:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération de l\'abonnement' 
        });
    }
});

// Annuler un abonnement
router.post('/stripe/subscription/:subscriptionId/cancel', requireAuth, async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { immediate = false } = req.body;
        
        const subscription = await stripeService.cancelSubscription(subscriptionId, immediate);
        
        res.json({ 
            success: true, 
            data: subscription,
            message: immediate ? 'Abonnement annulé immédiatement' : 'Abonnement sera annulé à la fin de la période' 
        });
    } catch (error) {
        logger.error('Erreur API stripe cancel:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'annulation de l\'abonnement' 
        });
    }
});

// Obtenir les informations de prix
router.get('/stripe/price/:priceId', requireAuth, async (req, res) => {
    try {
        const { priceId } = req.params;
        
        const price = await stripeService.getPrice(priceId);
        
        res.json({ 
            success: true, 
            data: price,
            message: 'Informations de prix récupérées' 
        });
    } catch (error) {
        logger.error('Erreur API stripe price:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération du prix' 
        });
    }
});

// Webhook Stripe pour les notifications
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        const payload = req.body;
        
        const event = stripeService.verifyWebhookSignature(payload, signature);
        
        if (!event) {
            return res.status(400).json({ 
                success: false, 
                message: 'Signature webhook invalide' 
            });
        }

        // Traiter les événements
        switch (event.type) {
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            default:
                logger.info(`Événement Stripe non traité: ${event.type}`);
        }

        res.json({ 
            success: true, 
            message: 'Webhook traité avec succès' 
        });
    } catch (error) {
        logger.error('Erreur API webhook stripe:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du traitement du webhook' 
        });
    }
});

// Handlers pour les webhooks
async function handleSubscriptionCreated(subscription) {
    logger.info(`Abonnement créé: ${subscription.id}`);
    // TODO: Mettre à jour la base de données
    // TODO: Envoyer un email de confirmation
}

async function handleSubscriptionUpdated(subscription) {
    logger.info(`Abonnement mis à jour: ${subscription.id}`);
    // TODO: Mettre à jour la base de données
}

async function handleSubscriptionDeleted(subscription) {
    logger.info(`Abonnement supprimé: ${subscription.id}`);
    // TODO: Mettre à jour la base de données
    // TODO: Envoyer un email d'annulation
}

async function handlePaymentSucceeded(invoice) {
    logger.info(`Paiement réussi: ${invoice.id}`);
    // TODO: Mettre à jour le statut de l'abonnement
    // TODO: Envoyer un email de confirmation de paiement
}

async function handlePaymentFailed(invoice) {
    logger.info(`Paiement échoué: ${invoice.id}`);
    // TODO: Mettre à jour le statut de l'abonnement
    // TODO: Envoyer un email d'échec de paiement
}

// ============================================================================
// ROUTES UTILITAIRES
// ============================================================================

// Créer une session de checkout pour l'abonnement Agency Pro
router.post('/stripe/create-checkout-session', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email et nom requis' 
            });
        }

        // Créer un client Stripe
        const customer = await stripeService.createCustomer('temp_' + Date.now(), email, name);
        
        // Créer ou récupérer le produit/price
        const product = await stripeService.createSubscriptionProduct();
        const price = await stripeService.createSubscriptionPrice(product.id);
        
        // URLs de redirection
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        const successUrl = `${baseUrl}/signup.html?agency=true&paid=true&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseUrl}/pricing`;
        
        // Créer la session de checkout
        const session = await stripeService.createCheckoutSession(customer.id, price.id, successUrl, cancelUrl);
        
        res.json({ 
            success: true, 
            data: session,
            message: 'Session de checkout créée' 
        });
    } catch (error) {
        logger.error('Erreur API stripe checkout:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de la création de la session de paiement' 
        });
    }
});

// Obtenir le statut des services
router.get('/services/status', (req, res) => {
    res.json({
        success: true,
        data: {
            stripe: {
                enabled: stripeService.enabled,
                service: 'Stripe Payments'
            }
        },
        message: 'Statut des services récupéré'
    });
});

module.exports = router;
