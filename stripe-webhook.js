// Webhook Stripe - Version simplifiée (sans customer.subscription.created)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const { updateStripeSubscription } = require('./auth.js');

const router = express.Router();

// Endpoint pour recevoir les webhooks Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Vérifier la signature du webhook
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log('🔔 Webhook Stripe reçu:', event.type);
    } catch (err) {
        console.log('❌ Erreur signature webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer les événements
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event.data.object);
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
            console.log(`📋 Événement non géré: ${event.type}`);
    }

    res.json({ received: true });
});

// Gérer checkout session complétée (crée ET active l'abonnement)
async function handleCheckoutSessionCompleted(session) {
    console.log('💰 Checkout complété:', session.id);
    
    try {
        const userId = session.metadata?.user_id;
        const planType = session.metadata?.plan_type;
        
        if (userId && planType) {
            console.log(`👤 Création/Mise à jour abonnement user ${userId} -> plan ${planType}`);
            
            await updateStripeSubscription(userId, {
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
                planType: planType,
                subscriptionStatus: 'active',
                subscriptionActive: true
            });
            
            console.log('✅ Abonnement créé et activé avec succès');
        }
    } catch (error) {
        console.error('❌ Erreur création abonnement:', error);
    }
}

// Gérer mise à jour d'abonnement
async function handleSubscriptionUpdated(subscription) {
    console.log('🔄 Abonnement mis à jour:', subscription.id);
    
    try {
        // Récupérer le client pour trouver l'utilisateur
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.user_id;
        
        if (userId) {
            await updateStripeSubscription(userId, {
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                subscriptionActive: subscription.status === 'active'
            });
            
            console.log('✅ Abonnement mis à jour');
        }
    } catch (error) {
        console.error('❌ Erreur mise à jour abonnement:', error);
    }
}

// Gérer suppression d'abonnement
async function handleSubscriptionDeleted(subscription) {
    console.log('🗑️ Abonnement supprimé:', subscription.id);
    
    try {
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.user_id;
        
        if (userId) {
            await updateStripeSubscription(userId, {
                stripeSubscriptionId: null,
                planType: 'free',
                subscriptionStatus: 'canceled',
                subscriptionActive: false
            });
            
            console.log('✅ Abonnement désactivé');
        }
    } catch (error) {
        console.error('❌ Erreur suppression abonnement:', error);
    }
}

// Gérer paiement réussi
async function handlePaymentSucceeded(invoice) {
    console.log('💳 Paiement réussi:', invoice.id);
    
    try {
        if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const customer = await stripe.customers.retrieve(subscription.customer);
            const userId = customer.metadata?.user_id;
            
            if (userId) {
                await updateStripeSubscription(userId, {
                    subscriptionStatus: 'active',
                    subscriptionActive: true
                });
                
                console.log('✅ Paiement validé, abonnement actif');
            }
        }
    } catch (error) {
        console.error('❌ Erreur paiement réussi:', error);
    }
}

// Gérer échec de paiement
async function handlePaymentFailed(invoice) {
    console.log('❌ Paiement échoué:', invoice.id);
    
    try {
        if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const customer = await stripe.customers.retrieve(subscription.customer);
            const userId = customer.metadata?.user_id;
            
            if (userId) {
                await updateStripeSubscription(userId, {
                    subscriptionStatus: 'past_due',
                    subscriptionActive: false
                });
                
                console.log('⚠️ Paiement échoué, abonnement suspendu');
            }
        }
    } catch (error) {
        console.error('❌ Erreur paiement échoué:', error);
    }
}

module.exports = router;
