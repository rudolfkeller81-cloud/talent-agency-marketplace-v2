const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('./logger');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const DB = require('./db');

// Initialiser les tables de facturation
function initBillingTables() {
    // Tables déjà créées par setup-billing.js
    logger.info('📋 Tables de facturation initialisées');
}

// Créer un abonnement
async function createSubscription(userId, planType, paymentMethodId) {
    try {
        const plan = await DB.queryOne('SELECT * FROM subscription_plans WHERE type = ? AND is_active = 1', [planType]);
        if (!plan) throw new Error('Plan not found');
        
        let customerId;
        const user = await getUserById(userId);
        
        if (user.stripe_customer_id) {
            customerId = user.stripe_customer_id;
        } else {
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                metadata: { user_id: userId }
            });
            customerId = customer.id;
            await DB.execute('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, userId]);
        }
        
        const subscriptionData = {
            customer: customerId,
            items: [{ price: plan.stripe_price_id }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent']
        };
        
        if (plan.trial_days > 0) {
            subscriptionData.trial_period_days = plan.trial_days;
        }
        
        const stripeSubscription = await stripe.subscriptions.create(subscriptionData);
        
        const trialEndDate = plan.trial_days > 0 ? moment().add(plan.trial_days, 'days').toDate() : null;
        const nextBillingDate = moment().add(1, plan.billing_interval === 'year' ? 'years' : 'weeks').toDate();
        
        const result = await DB.execute(
            `INSERT INTO subscriptions (user_id, plan_type, status, trial_end_date, next_billing_date, stripe_subscription_id, stripe_customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, planType, 'trial', trialEndDate, nextBillingDate, stripeSubscription.id, customerId]
        );
        const subscriptionId = result.lastID;
        
        if (stripeSubscription.latest_invoice) {
            await createInvoice(userId, subscriptionId, stripeSubscription.latest_invoice);
        }
        
        await createBillingEvent(userId, subscriptionId, 'trial_started', { plan_type: planType, trial_end_date: trialEndDate });
        
        return {
            subscriptionId,
            clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret,
            trialEndDate,
            nextBillingDate
        };
    } catch (error) {
        logger.error('Error creating subscription:', error);
        throw error;
    }
}

// Récupérer un abonnement
async function getSubscription(userId) {
    return DB.queryOne(
        `SELECT s.*, sp.name as plan_name, sp.price, sp.billing_interval, sp.trial_days
         FROM subscriptions s LEFT JOIN subscription_plans sp ON s.plan_type = sp.type
         WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1`,
        [userId]
    );
}

// Mettre à jour un abonnement
async function updateSubscription(subscriptionId, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(subscriptionId);
    const result = await DB.execute(`UPDATE subscriptions SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    return result.changes;
}

// Annuler un abonnement
async function cancelSubscription(userId, subscriptionId, immediate = false) {
    try {
        const subscription = await DB.queryOne('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?', [subscriptionId, userId]);
        if (!subscription) throw new Error('Subscription not found');
        
        if (immediate) {
            await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
            await updateSubscription(subscriptionId, { status: 'cancelled', cancelled_at: new Date() });
        } else {
            await stripe.subscriptions.update(subscription.stripe_subscription_id, { cancel_at_period_end: true });
            await updateSubscription(subscriptionId, { status: 'cancelled' });
        }
        
        await createBillingEvent(userId, subscriptionId, 'subscription_cancelled', { immediate });
        return true;
    } catch (error) {
        logger.error('Error cancelling subscription:', error.message);
        throw error;
    }
}

// Créer une facture
async function createInvoice(userId, subscriptionId, stripeInvoice) {
    try {
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const result = await DB.execute(
            `INSERT INTO invoices (user_id, subscription_id, invoice_number, amount, currency, status, billing_date, due_date, stripe_invoice_id, invoice_url, pdf_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, subscriptionId, invoiceNumber, stripeInvoice.amount / 100, stripeInvoice.currency.toUpperCase(), stripeInvoice.status, new Date(stripeInvoice.created * 1000), new Date(stripeInvoice.due_date * 1000), stripeInvoice.id, stripeInvoice.hosted_invoice_url, stripeInvoice.invoice_pdf]
        );
        const invoiceId = result.lastID;
        
        if (stripeInvoice.payment_intent) {
            await createPayment(userId, invoiceId, stripeInvoice.payment_intent);
        }
        return invoiceId;
    } catch (error) {
        logger.error('Error creating invoice:', error.message);
        throw error;
    }
}

// Créer un paiement
async function createPayment(userId, invoiceId, paymentIntent) {
    try {
        await DB.execute(
            'INSERT INTO payments (user_id, invoice_id, amount, currency, status, stripe_payment_intent_id, stripe_charge_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, invoiceId, paymentIntent.amount / 100, paymentIntent.currency.toUpperCase(), paymentIntent.status, paymentIntent.id, paymentIntent.charges.data[0]?.id]
        );
        
        if (paymentIntent.status === 'succeeded') {
            await DB.execute('UPDATE invoices SET status = ?, paid_date = ? WHERE id = ?', ['paid', new Date(), invoiceId]);
        }
    } catch (error) {
        logger.error('Error creating payment:', error.message);
        throw error;
    }
}

// Récupérer les factures d'un utilisateur
async function getInvoices(userId, limit = 50, offset = 0) {
    return DB.queryAll(
        `SELECT i.*, s.plan_type, sp.name as plan_name FROM invoices i
         LEFT JOIN subscriptions s ON i.subscription_id = s.id
         LEFT JOIN subscription_plans sp ON s.plan_type = sp.type
         WHERE i.user_id = ? ORDER BY i.billing_date DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
}

// Récupérer les paiements d'un utilisateur
async function getPayments(userId, limit = 50, offset = 0) {
    return DB.queryAll(
        `SELECT p.*, i.invoice_number, i.billing_date FROM payments p
         LEFT JOIN invoices i ON p.invoice_id = i.id
         WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
}

// Récupérer les plans d'abonnement
async function getSubscriptionPlans() {
    return DB.queryAll('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC');
}

// Traiter un paiement
async function processPayment(paymentIntentId) {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
            await DB.execute('UPDATE payments SET status = ? WHERE stripe_payment_intent_id = ?', ['completed', paymentIntentId]);
            await DB.execute(
                `UPDATE invoices SET status = 'paid', paid_date = ? WHERE id IN (SELECT invoice_id FROM payments WHERE stripe_payment_intent_id = ?)`,
                [new Date(), paymentIntentId]
            );
            return { success: true, status: 'completed' };
        }
        return { success: false, status: paymentIntent.status };
    } catch (error) {
        logger.error('Error processing payment:', error.message);
        throw error;
    }
}

// Générer un PDF de facture
async function generateInvoicePDF(invoiceId) {
    try {
        const invoice = await DB.queryOne(
            `SELECT i.*, u.first_name, u.last_name, u.email, u.address, u.city, u.country
             FROM invoices i LEFT JOIN users u ON i.user_id = u.id WHERE i.id = ?`,
            [invoiceId]
        );
        if (!invoice) throw new Error('Invoice not found');
        
        const pdfPath = path.join(__dirname, 'invoices', 'pdf', `invoice-${invoice.invoice_number}.pdf`);
        const doc = new PDFDocument();
        
        // Pipe le PDF vers un fichier
        doc.pipe(fs.createWriteStream(pdfPath));
        
        // En-tête
        doc.fontSize(20).text('INVOICE', 50, 50);
        doc.fontSize(12).text(`Invoice #: ${invoice.invoice_number}`, 50, 80);
        doc.text(`Date: ${new Date(invoice.billing_date).toLocaleDateString()}`, 50, 100);
        
        // Informations client
        doc.text('Bill To:', 50, 140);
        doc.text(`${invoice.first_name} ${invoice.last_name}`, 50, 160);
        doc.text(invoice.email, 50, 180);
        if (invoice.address) {
            doc.text(invoice.address, 50, 200);
            doc.text(`${invoice.city}, ${invoice.country}`, 50, 220);
        }
        
        // Détails de la facture
        doc.text('Amount Due:', 400, 140);
        doc.fontSize(16).text(`$${invoice.amount} ${invoice.currency}`, 400, 160);
        doc.fontSize(12).text(`Status: ${invoice.status.toUpperCase()}`, 400, 190);
        
        // Pied de page
        doc.fontSize(10).text('Thank you for your business!', 50, 700);
        
        // Finaliser le PDF
        doc.end();
        
        // Mettre à jour l'URL du PDF dans la base de données
        await DB.execute('UPDATE invoices SET pdf_url = ? WHERE id = ?', [`/invoices/pdf/invoice-${invoice.invoice_number}.pdf`, invoiceId]);
        
        return pdfPath;
        
    } catch (error) {
        logger.error('Error generating invoice PDF:', error.message);
        throw error;
    }
}

// Gérer les webhooks Stripe
async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        logger.info(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    switch (event.type) {
        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            await processPayment(invoice.payment_intent);
            await DB.execute(
                `UPDATE subscriptions SET status = 'active', next_billing_date = ? WHERE stripe_subscription_id = ?`,
                [new Date(invoice.period_end * 1000), invoice.subscription]
            );
            await createBillingEvent(
                await getUserIdFromStripeSubscription(invoice.subscription),
                await getSubscriptionIdFromStripe(invoice.subscription),
                'payment_succeeded',
                { amount: invoice.amount_paid, currency: invoice.currency }
            );
            break;
            
        case 'invoice.payment_failed':
            const failedInvoice = event.data.object;
            await DB.execute('UPDATE invoices SET status = ? WHERE stripe_invoice_id = ?', ['failed', failedInvoice.id]);
            break;
            
        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            await DB.execute('UPDATE subscriptions SET status = ?, cancelled_at = ? WHERE stripe_subscription_id = ?', ['cancelled', new Date(), subscription.id]);
            break;
            
        default:
            logger.info(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
}

// Créer un événement de facturation
async function createBillingEvent(userId, subscriptionId, eventType, eventData) {
    const result = await DB.execute(
        'INSERT INTO billing_events (user_id, subscription_id, event_type, event_data) VALUES (?, ?, ?, ?)',
        [userId, subscriptionId, eventType, JSON.stringify(eventData)]
    );
    return result.lastID;
}

// Vérifier l'expiration des essais
async function checkTrialExpiry() {
    const expiringTrials = await DB.queryAll(
        `SELECT * FROM subscriptions WHERE status = 'trial' AND trial_end_date <= ?`,
        [new Date()]
    );
    
    for (const trial of expiringTrials) {
        await updateSubscription(trial.id, { status: 'expired' });
        await createBillingEvent(trial.user_id, trial.id, 'trial_expired', {
            trial_end_date: trial.trial_end_date
        });
    }
    
    return expiringTrials.length;
}

// Traiter le renouvellement automatique
async function processAutoRenewal() {
    const renewals = await DB.queryAll(
        `SELECT * FROM subscriptions WHERE status = 'active' AND next_billing_date <= ? AND cancelled_at IS NULL`,
        [new Date()]
    );
    
    for (const subscription of renewals) {
        try {
            // Récupérer l'abonnement Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
            
            // Mettre à jour la prochaine date de facturation
            const nextBillingDate = moment(stripeSubscription.current_period_end * 1000).toDate();
            await updateSubscription(subscription.id, { next_billing_date: nextBillingDate });
            
            await createBillingEvent(subscription.user_id, subscription.id, 'subscription_renewed', {
                next_billing_date: nextBillingDate
            });
            
        } catch (error) {
            logger.error('Error processing auto renewal for subscription:', subscription.id, error.message);
        }
    }
    
    return renewals.length;
}

// Fonctions utilitaires
async function getUserIdFromStripeSubscription(stripeSubscriptionId) {
    const result = await DB.queryOne('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?', [stripeSubscriptionId]);
    return result ? result.user_id : null;
}

async function getSubscriptionIdFromStripe(stripeSubscriptionId) {
    const result = await DB.queryOne('SELECT id FROM subscriptions WHERE stripe_subscription_id = ?', [stripeSubscriptionId]);
    return result ? result.id : null;
}

async function getUserById(userId) {
    return DB.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
}

module.exports = {
    initBillingTables,
    createSubscription,
    getSubscription,
    updateSubscription,
    cancelSubscription,
    createInvoice,
    getInvoices,
    getPayments,
    getSubscriptionPlans,
    processPayment,
    generateInvoicePDF,
    handleStripeWebhook,
    checkTrialExpiry,
    processAutoRenewal
};
