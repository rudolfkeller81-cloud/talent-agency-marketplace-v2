// Configuration Stripe
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SOFNVBMaYssuiS8eNDOBocWrjFM42ZRWjXGpLnDsPxtgNoTGs6k4r3iFOJpe9xaKFqkpyrwvjvV4ivB8MULb0m3000LCfCz2L';

// Initialiser Stripe
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
const elements = stripe.elements();

// Variables globales
let selectedPlan = null;
let selectedPrice = 0;

// DOM Elements
const paymentForm = document.getElementById('payment-form');
const submitButton = document.getElementById('submit-button');
const buttonText = document.getElementById('button-text');
const spinner = document.getElementById('spinner');
const cardErrors = document.getElementById('card-errors');
const paymentSuccess = document.getElementById('payment-success');
const selectedPlanDisplay = document.querySelector('.plan-name');
const selectedPriceDisplay = document.querySelector('.plan-price');

// Créer l'élément de carte
const cardElement = elements.create('card', {
    style: {
        base: {
            color: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: 'rgba(255, 255, 255, 0.3)',
            },
            iconColor: '#ffffff',
        },
        invalid: {
            color: '#ff6b6b',
            iconColor: '#ff6b6b',
        },
    },
    hidePostalCode: false
});

// Monter l'élément de carte
cardElement.mount('#card-element');

// Gérer les erreurs de carte
cardElement.on('change', ({ error }) => {
    if (error) {
        cardErrors.textContent = error.message;
    } else {
        cardErrors.textContent = '';
    }
    updateSubmitButton();
});

// Gérer la sélection des plans
document.querySelectorAll('.btn-select-plan').forEach(button => {
    button.addEventListener('click', function() {
        const card = this.closest('.pricing-card');
        const plan = card.dataset.plan;
        const price = parseInt(this.dataset.price);
        
        // Mettre à jour la sélection
        document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        selectedPlan = plan;
        selectedPrice = price;
        
        // Mettre à jour l'affichage
        selectedPlanDisplay.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
        selectedPriceDisplay.textContent = price === 0 ? 'Gratuit' : `€${(price / 100).toFixed(2)}/mois`;
        
        updateSubmitButton();
    });
});

// Mettre à jour le bouton de soumission
function updateSubmitButton() {
    const email = document.getElementById('email').value;
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    
    const isFormValid = email && firstName && lastName && selectedPlan !== null;
    const isCardComplete = cardElement._complete;
    
    submitButton.disabled = !(isFormValid && isCardComplete && selectedPrice > 0);
    
    if (selectedPrice === 0) {
        buttonText.textContent = 'S\'inscrire gratuitement';
    } else {
        buttonText.textContent = `Payer €${(selectedPrice / 100).toFixed(2)}`;
    }
}

// Écouter les changements du formulaire
document.querySelectorAll('#payment-form input').forEach(input => {
    input.addEventListener('input', updateSubmitButton);
});

// Gérer la soumission du formulaire
paymentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    if (selectedPrice === 0) {
        // Inscription gratuite - pas de paiement
        handleFreeSubscription();
        return;
    }
    
    setLoading(true);
    
    try {
        // Créer le PaymentIntent côté serveur
        const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: selectedPrice,
                currency: 'eur',
                email: document.getElementById('email').value,
                plan: selectedPlan
            }),
        });
        
        const { clientSecret, error } = await response.json();
        
        if (error) {
            throw new Error(error);
        }
        
        // Confirmer le paiement
        const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    email: document.getElementById('email').value,
                    name: `${document.getElementById('first-name').value} ${document.getElementById('last-name').value}`,
                },
            },
        });
        
        if (paymentError) {
            throw new Error(paymentError.message);
        }
        
        if (paymentIntent.status === 'succeeded') {
            handlePaymentSuccess(paymentIntent);
        } else {
            throw new Error('Le paiement n\'a pas pu être complété');
        }
        
    } catch (error) {
        console.error('Erreur de paiement:', error);
        cardErrors.textContent = error.message;
        setLoading(false);
    }
});

// Gérer l'inscription gratuite
async function handleFreeSubscription() {
    setLoading(true);
    
    try {
        const response = await fetch('/create-free-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                firstName: document.getElementById('first-name').value,
                lastName: document.getElementById('last-name').value,
                plan: selectedPlan
            }),
        });
        
        const { success, error } = await response.json();
        
        if (error) {
            throw new Error(error);
        }
        
        if (success) {
            handlePaymentSuccess();
        } else {
            throw new Error('L\'inscription a échoué');
        }
        
    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        cardErrors.textContent = error.message;
        setLoading(false);
    }
}

// Gérer le succès du paiement
function handlePaymentSuccess(paymentIntent = null) {
    setLoading(false);
    
    // Masquer le formulaire et afficher le succès
    paymentForm.classList.add('hidden');
    paymentSuccess.classList.remove('hidden');
    
    // Log pour le débogage
    if (paymentIntent) {
        console.log('Paiement réussi:', paymentIntent.id);
        
        // Envoyer les données analytics ou de suivi
        if (typeof gtag !== 'undefined') {
            gtag('event', 'purchase', {
                transaction_id: paymentIntent.id,
                value: selectedPrice / 100,
                currency: 'EUR',
                items: [{
                    item_name: selectedPlan,
                    category: 'subscription',
                    price: selectedPrice / 100,
                    quantity: 1
                }]
            });
        }
    }
    
    // Rediriger après 3 secondes
    setTimeout(() => {
        window.location.href = '/dashboard';
    }, 3000);
}

// Gérer l'état de chargement
function setLoading(isLoading) {
    if (isLoading) {
        submitButton.disabled = true;
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        submitButton.disabled = false;
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
        updateSubmitButton();
    }
}

// Gérer le bouton dashboard
document.querySelector('.btn-dashboard')?.addEventListener('click', () => {
    window.location.href = '/dashboard';
});

// Initialisation
updateSubmitButton();
