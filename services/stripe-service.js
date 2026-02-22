// ============================================================================
// SERVICE STRIPE - PAIEMENTS & ABONNEMENTS
// ============================================================================

const logger = require('../logger');

class StripeService {
    constructor() {
        // Initialiser Stripe avec les clés de test
        try {
            if (process.env.STRIPE_SECRET_KEY) {
                this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                this.enabled = true;
                logger.info('Service Stripe initialisé avec clés de test');
            } else {
                this.stripe = null;
                this.enabled = false;
                logger.warn('STRIPE_SECRET_KEY non défini - Service Stripe en mode simulation');
            }
        } catch (error) {
            this.stripe = null;
            this.enabled = false;
            logger.warn('Module Stripe non disponible - Service en mode simulation');
        }
    }

    // Créer un client Stripe
    async createCustomer(userId, email, name) {
        if (!this.enabled) {
            logger.info(`Customer Stripe simulé pour ${email}`);
            return { id: `cus_sim_${userId}`, email };
        }

        try {
            const customer = await this.stripe.customers.create({
                email: email,
                name: name,
                metadata: {
                    userId: userId.toString()
                }
            });

            logger.info(`Customer Stripe créé: ${customer.id} pour ${email}`);
            return customer;
        } catch (error) {
            logger.error('Erreur création customer Stripe:', error);
            throw error;
        }
    }

    // Créer un produit d'abonnement
    async createSubscriptionProduct() {
        if (!this.enabled) {
            return { id: 'prod_sim_agency', name: 'Agency Pro' };
        }

        try {
            const product = await this.stripe.products.create({
                name: 'Agency Pro',
                description: 'Abonnement premium pour les agences - Accès illimité aux talents et analytics avancés',
                type: 'service',
                metadata: {
                    type: 'agency_subscription'
                }
            });

            logger.info(`Produit Stripe créé: ${product.id}`);
            return product;
        } catch (error) {
            logger.error('Erreur création produit Stripe:', error);
            throw error;
        }
    }

    // Créer un prix d'abonnement
    async createSubscriptionPrice(productId) {
        if (!this.enabled) {
            return { id: 'price_sim_agency', unit_amount: 999, currency: 'usd' };
        }

        try {
            const price = await this.stripe.prices.create({
                product: productId,
                unit_amount: 999, // 9.99$ en cents
                currency: 'usd',
                recurring: {
                    interval: 'month',
                    interval_count: 1
                },
                metadata: {
                    type: 'agency_monthly'
                }
            });

            logger.info(`Prix Stripe créé: ${price.id} - 9.99$/mois`);
            return price;
        } catch (error) {
            logger.error('Erreur création prix Stripe:', error);
            throw error;
        }
    }

    // Créer une session de checkout
    async createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
        if (!this.enabled) {
            return {
                id: 'cs_sim_session',
                url: `${successUrl}?session_id=cs_sim_session`
            };
        }

        try {
            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    type: 'agency_subscription'
                },
                subscription_data: {
                    trial_period_days: 1, // 1 jour gratuit
                    metadata: {
                        type: 'agency_subscription'
                    }
                }
            });

            logger.info(`Session checkout créée: ${session.id}`);
            return session;
        } catch (error) {
            logger.error('Erreur création session Stripe:', error);
            throw error;
        }
    }

    // Créer un portail client pour la gestion
    async createCustomerPortalSession(customerId, returnUrl) {
        if (!this.enabled) {
            return {
                url: returnUrl
            };
        }

        try {
            const session = await this.stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl
            });

            logger.info(`Session portail client créée: ${session.id}`);
            return session;
        } catch (error) {
            logger.error('Erreur création portail client Stripe:', error);
            throw error;
        }
    }

    // Récupérer les détails d'un abonnement
    async getSubscription(subscriptionId) {
        if (!this.enabled) {
            return {
                id: 'sub_sim_agency',
                status: 'active',
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                trial_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            };
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            return subscription;
        } catch (error) {
            logger.error('Erreur récupération abonnement Stripe:', error);
            throw error;
        }
    }

    // Annuler un abonnement
    async cancelSubscription(subscriptionId, immediate = false) {
        if (!this.enabled) {
            logger.info(`Abonnement simulé annulé: ${subscriptionId}`);
            return { id: subscriptionId, status: 'canceled' };
        }

        try {
            let canceledSubscription;
            
            if (immediate) {
                canceledSubscription = await this.stripe.subscriptions.cancel(subscriptionId);
            } else {
                canceledSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true
                });
            }

            logger.info(`Abonnement annulé: ${subscriptionId}`);
            return canceledSubscription;
        } catch (error) {
            logger.error('Erreur annulation abonnement Stripe:', error);
            throw error;
        }
    }

    // Mettre à jour un abonnement
    async updateSubscription(subscriptionId, updates) {
        if (!this.enabled) {
            logger.info(`Abonnement simulé mis à jour: ${subscriptionId}`);
            return { id: subscriptionId, ...updates };
        }

        try {
            const subscription = await this.stripe.subscriptions.update(subscriptionId, updates);
            logger.info(`Abonnement mis à jour: ${subscriptionId}`);
            return subscription;
        } catch (error) {
            logger.error('Erreur mise à jour abonnement Stripe:', error);
            throw error;
        }
    }

    // Créer un webhook endpoint
    async createWebhookEndpoint(url) {
        if (!this.enabled) {
            return { id: 'wh_sim_webhook', url };
        }

        try {
            const webhookEndpoint = await this.stripe.webhookEndpoints.create({
                url: url,
                enabled_events: [
                    'customer.subscription.created',
                    'customer.subscription.updated',
                    'customer.subscription.deleted',
                    'invoice.payment_succeeded',
                    'invoice.payment_failed'
                ]
            });

            logger.info(`Webhook Stripe créé: ${webhookEndpoint.id}`);
            return webhookEndpoint;
        } catch (error) {
            logger.error('Erreur création webhook Stripe:', error);
            throw error;
        }
    }

    // Vérifier la signature d'un webhook
    verifyWebhookSignature(payload, signature) {
        if (!this.enabled) {
            return true; // Simulation
        }

        try {
            return this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (error) {
            logger.error('Erreur vérification signature webhook:', error);
            return null;
        }
    }

    // Obtenir les informations de prix
    async getPrice(priceId) {
        if (!this.enabled) {
            return {
                id: priceId,
                unit_amount: 29900,
                currency: 'eur',
                recurring: { interval: 'month' }
            };
        }

        try {
            const price = await this.stripe.prices.retrieve(priceId);
            return price;
        } catch (error) {
            logger.error('Erreur récupération prix Stripe:', error);
            throw error;
        }
    }

    // Obtenir les informations du client
    async getCustomer(customerId) {
        if (!this.enabled) {
            return {
                id: customerId,
                email: 'simulated@example.com',
                name: 'Simulated Customer'
            };
        }

        try {
            const customer = await this.stripe.customers.retrieve(customerId);
            return customer;
        } catch (error) {
            logger.error('Erreur récupération customer Stripe:', error);
            throw error;
        }
    }

    // Helper: Formater le prix
    formatPrice(amount, currency = 'eur') {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount / 100);
    }

    // Helper: Obtenir le statut de l'abonnement
    getSubscriptionStatusText(status) {
        const statusMap = {
            'trialing': 'Essai en cours',
            'active': 'Actif',
            'past_due': 'En retard',
            'canceled': 'Annulé',
            'unpaid': 'Impayé',
            'incomplete': 'Incomplet'
        };
        return statusMap[status] || status;
    }
}

module.exports = new StripeService();
