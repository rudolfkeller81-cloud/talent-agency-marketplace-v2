// Configuration Stripe côté client (FRONTEND)
// SEULEMENT la clé publique peut être utilisée ici

import { loadStripe } from '@stripe/stripe-js';

// Clé publique depuis les variables d'environnement ou configuration
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...';

// Initialiser Stripe
let stripe;

async function initializeStripe() {
  if (!stripe) {
    stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripe;
}

// Exemple de paiement côté client
async function processPayment(clientSecret) {
  const stripeInstance = await initializeStripe();
  
  const { error } = await stripeInstance.confirmCardPayment(clientSecret, {
    payment_method: {
      card: {
        // Les éléments de carte seront gérés par Stripe Elements
      }
    }
  });
  
  if (error) {
    console.error('Erreur paiement:', error);
    return { success: false, error };
  }
  
  return { success: true };
}

// Exemple pour les abonnements
async function processSubscription(clientSecret) {
  const stripeInstance = await initializeStripe();
  
  const { error } = await stripeInstance.confirmCardSetup(clientSecret, {
    payment_method: {
      card: {
        // Configuration de la carte
      }
    }
  });
  
  if (error) {
    console.error('Erreur abonnement:', error);
    return { success: false, error };
  }
  
  return { success: true };
}

export {
  initializeStripe,
  processPayment,
  processSubscription
};
