// Authentification côté client
document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    const switchText = document.getElementById('switchText');
    const switchTextLogin = document.getElementById('switchTextLogin');
    const authMessage = document.getElementById('authMessage');

    // Switch entre login et register
    switchToRegister.addEventListener('click', () => {
        showRegisterForm();
    });

    switchToLogin.addEventListener('click', () => {
        showLoginForm();
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRegister();
    });

    // Fonctions
    function showRegisterForm() {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        formTitle.textContent = 'Inscription';
        formSubtitle.textContent = 'Créez votre compte Talent & Agency';
        switchText.classList.add('hidden');
        switchTextLogin.classList.remove('hidden');
        hideMessage();
    }

    function showLoginForm() {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        formTitle.textContent = 'Connexion';
        formSubtitle.textContent = 'Connectez-vous à votre compte';
        switchText.classList.remove('hidden');
        switchTextLogin.classList.add('hidden');
        hideMessage();
    }

    // Gérer le login
    async function handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            showMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        setLoading('login', true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur de connexion');
            }

            // Stocker la session
            if (rememberMe) {
                localStorage.setItem('sessionId', data.sessionId);
            } else {
                sessionStorage.setItem('sessionId', data.sessionId);
            }

            // Mettre à jour le cookie
            document.cookie = `sessionId=${data.sessionId}; path=/; max-age=86400`;

            showMessage('Connexion réussie! Redirection...', 'success');

            // Rediriger vers l'accueil
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (error) {
            console.error('Erreur login:', error);
            showMessage(error.message, 'error');
        } finally {
            setLoading('login', false);
        }
    }

    // Gérer l'inscription
    async function handleRegister() {
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            showMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        if (password.length < 8) {
            showMessage('Le mot de passe doit contenir au moins 8 caractères', 'error');
            return;
        }

        if (!agreeTerms) {
            showMessage('Veuillez accepter les conditions d\'utilisation', 'error');
            return;
        }

        setLoading('register', true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur d\'inscription');
            }

            showMessage('Inscription réussie! Redirection...', 'success');

            // Stocker la session
            localStorage.setItem('sessionId', data.sessionId);
            document.cookie = `sessionId=${data.sessionId}; path=/; max-age=86400`;

            // Rediriger vers l'accueil
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (error) {
            console.error('Erreur register:', error);
            showMessage(error.message, 'error');
        } finally {
            setLoading('register', false);
        }
    }

    // Gérer l'état de chargement
    function setLoading(form, isLoading) {
        const btn = document.getElementById(`${form}Btn`);
        const btnText = document.getElementById(`${form}BtnText`);
        const spinner = document.getElementById(`${form}Spinner`);

        if (isLoading) {
            btn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    // Afficher un message
    function showMessage(text, type) {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${type}`;
        authMessage.classList.remove('hidden');
    }

    // Cacher le message
    function hideMessage() {
        authMessage.classList.add('hidden');
    }

    // Validation en temps réel
    document.getElementById('confirmPassword').addEventListener('input', function() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = this.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.classList.add('error');
            showMessage('Les mots de passe ne correspondent pas', 'error');
        } else {
            this.classList.remove('error');
            hideMessage();
        }
    });

    // Validation email
    document.getElementById('registerEmail').addEventListener('blur', function() {
        const email = this.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            this.classList.add('error');
            showMessage('Veuillez entrer une adresse email valide', 'error');
        } else {
            this.classList.remove('error');
            hideMessage();
        }
    });

    // Mot de passe fort
    document.getElementById('registerPassword').addEventListener('input', function() {
        const password = this.value;
        
        if (password.length < 8) {
            this.classList.add('error');
            showMessage('Le mot de passe doit contenir au moins 8 caractères', 'error');
        } else {
            this.classList.remove('error');
            hideMessage();
        }
    });
});
