// Composant de navigation unifié
class NavigationManager {
    constructor() {
        this.currentPage = window.location.pathname;
        this.user = null;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupActiveLinks();
        this.checkAuthStatus();
    }

    setupNavigation() {
        // Créer le header HTML commun
        const headerHTML = `
            <header class="header">
                <nav class="nav">
                    <div class="logo">
                        <div class="logo-icon">T&A</div>
                        <span>Talent & Agency</span>
                    </div>
                    <ul class="nav-links" id="navLinks">
                        <li><a href="/" class="nav-link">Accueil</a></li>
                        <li><a href="/discover" class="nav-link">Découvrir</a></li>
                        <li><a href="/favorites" class="nav-link">Favoris</a></li>
                        <li><a href="/messages" class="nav-link">Messages</a></li>
                        <li><a href="/dashboard" class="nav-link">Tableau de bord</a></li>
                        <li><a href="/billing" class="nav-link">Facturation</a></li>
                    </ul>
                    <div class="nav-actions">
                        <button class="sign-in-btn" id="authBtn">Se connecter</button>
                        <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
                    </div>
                </nav>
            </header>
        `;

        // Insérer le header dans toutes les pages
        if (!document.querySelector('.header')) {
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
        }

        // Créer le footer HTML commun
        const footerHTML = `
            <footer class="footer">
                <div class="footer-content">
                    <div class="footer-section">
                        <h3>Talent & Agency</h3>
                        <p>La marketplace professionnelle pour les talents créatifs et les agences.</p>
                    </div>
                    <div class="footer-section">
                        <h4>Navigation</h4>
                        <ul>
                            <li><a href="/">Accueil</a></li>
                            <li><a href="/discover">Découvrir</a></li>
                            <li><a href="/favorites">Favoris</a></li>
                            <li><a href="/messages">Messages</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Support</h4>
                        <ul>
                            <li><a href="/contact">Contact</a></li>
                            <li><a href="/help">Aide</a></li>
                            <li><a href="/faq">FAQ</a></li>
                            <li><a href="/dashboard">Tableau de bord</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Légal</h4>
                        <ul>
                            <li><a href="/terms">Conditions d'utilisation</a></li>
                            <li><a href="/privacy">Politique de confidentialité</a></li>
                            <li><a href="/cookies">Politique cookies</a></li>
                            <li><a href="/agency-pricing">Tarifs agences</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <div class="footer-links">
                        <a href="/terms">Conditions d'utilisation</a>
                        <a href="/privacy">Politique de confidentialité</a>
                        <a href="/support">Support</a>
                        <a href="/blog">Blog</a>
                    </div>
                    <div class="footer-copyright">
                        © 2024 Talent & Agency. Tous droits réservés.
                    </div>
                </div>
            </footer>
        `;

        // Insérer le footer dans toutes les pages
        if (!document.querySelector('.footer')) {
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        }
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navLinks = document.getElementById('navLinks');

        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('mobile-open');
                mobileMenuBtn.textContent = navLinks.classList.contains('mobile-open') ? '✕' : '☰';
            });

            // Fermer le menu quand on clique sur un lien
            navLinks.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-link')) {
                    navLinks.classList.remove('mobile-open');
                    mobileMenuBtn.textContent = '☰';
                }
            });
        }
    }

    setupActiveLinks() {
        const links = document.querySelectorAll('.nav-link');
        const currentPath = window.location.pathname;

        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // Gérer les chemins relatifs et absolus
            const linkPath = href.startsWith('/') ? href : '/' + href;
            
            if (linkPath === currentPath || 
                (currentPath === '/' && linkPath === '/') ||
                (currentPath !== '/' && linkPath !== '/' && currentPath.startsWith(linkPath))) {
                link.classList.add('active');
            }
        });
    }

    async checkAuthStatus() {
        try {
            const token = localStorage.getItem('token');
            const authBtn = document.getElementById('authBtn');

            if (token) {
                // Vérifier si le token est valide
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.user = data.user;
                    this.updateAuthUI(true);
                } else {
                    localStorage.removeItem('token');
                    this.updateAuthUI(false);
                }
            } else {
                this.updateAuthUI(false);
            }
        } catch (error) {
            console.error('Erreur vérification auth:', error);
            this.updateAuthUI(false);
        }
    }

    updateAuthUI(isAuthenticated) {
        const authBtn = document.getElementById('authBtn');
        const navLinks = document.getElementById('navLinks');

        if (!authBtn) return;

        if (isAuthenticated && this.user) {
            // Utilisateur connecté
            authBtn.textContent = 'Déconnexion';
            authBtn.onclick = () => this.logout();
            
            // Ajouter les liens protégés
            this.addProtectedLinks();
        } else {
            // Utilisateur non connecté
            authBtn.textContent = 'Se connecter';
            authBtn.onclick = () => window.location.href = '/login';
            
            // Retirer les liens protégés
            this.removeProtectedLinks();
        }
    }

    addProtectedLinks() {
        const navLinks = document.getElementById('navLinks');
        if (!navLinks) return;

        // Ajouter les liens protégés s'ils n'existent pas déjà
        if (!navLinks.querySelector('[data-protected="true"]')) {
            const protectedLinks = `
                <li><a href="/dashboard" class="nav-link" data-protected="true">Tableau de bord</a></li>
                <li><a href="/messages" class="nav-link" data-protected="true">Messages</a></li>
                <li><a href="/favorites" class="nav-link" data-protected="true">Favoris</a></li>
                <li><a href="/billing" class="nav-link" data-protected="true">Facturation</a></li>
                <li><a href="/profile-settings" class="nav-link" data-protected="true">Profil</a></li>
            `;
            
            navLinks.insertAdjacentHTML('beforeend', protectedLinks);
            this.setupActiveLinks(); // Mettre à jour les liens actifs
        }
    }

    removeProtectedLinks() {
        const protectedLinks = document.querySelectorAll('[data-protected="true"]');
        protectedLinks.forEach(link => link.remove());
    }

    async logout() {
        try {
            const token = localStorage.getItem('token');
            
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }

            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            this.user = null;
            
            // Rediriger vers la page d'accueil
            window.location.href = '/';
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            // Même en cas d'erreur, on déconnecte localement
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/';
        }
    }

    // Navigation programmatique
    navigateTo(path) {
        window.location.href = path;
    }

    // Mettre à jour le statut de l'utilisateur
    updateUser(user) {
        this.user = user;
        this.updateAuthUI(true);
    }
}

// Styles CSS communs pour la navigation
const navigationStyles = `
/* Header et Navigation */
.header {
    background: rgba(0, 0, 0, 0.95);
    padding: 1rem 2rem;
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
}

.nav {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-size: 1.5rem;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
}

.logo-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    color: #fff;
}

.nav-links {
    display: flex;
    gap: 2rem;
    list-style: none;
    margin: 0;
    padding: 0;
}

.nav-link {
    color: #fff;
    text-decoration: none;
    font-size: 0.95rem;
    transition: color 0.3s;
    position: relative;
    padding: 0.5rem 0;
}

.nav-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    transition: width 0.3s ease;
}

.nav-link:hover::after,
.nav-link.active::after {
    width: 100%;
}

.nav-link:hover,
.nav-link.active {
    color: #3b82f6;
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.sign-in-btn {
    background: transparent;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 0.95rem;
}

.sign-in-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.mobile-menu-btn {
    display: none;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
}

/* Footer */
.footer {
    background: rgba(0, 0, 0, 0.95);
    padding: 3rem 2rem 2rem;
    margin-top: 5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
}

.footer-section h3,
.footer-section h4 {
    color: #fff;
    margin-bottom: 1rem;
    font-size: 1.1rem;
}

.footer-section p {
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
}

.footer-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.footer-section ul li {
    margin-bottom: 0.5rem;
}

.footer-section ul li a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: color 0.3s;
}

.footer-section ul li a:hover {
    color: #3b82f6;
}

.footer-bottom {
    max-width: 1200px;
    margin: 0 auto;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.footer-links {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
}

.footer-links a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: color 0.3s;
}

.footer-links a:hover {
    color: #3b82f6;
}

.footer-copyright {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
    .nav-links {
        position: fixed;
        top: 70px;
        left: 0;
        width: 100%;
        background: rgba(0, 0, 0, 0.95);
        flex-direction: column;
        padding: 2rem;
        gap: 1rem;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 999;
    }

    .nav-links.mobile-open {
        transform: translateX(0);
    }

    .mobile-menu-btn {
        display: block;
    }

    .footer-content {
        grid-template-columns: 1fr;
        text-align: center;
    }

    .footer-bottom {
        flex-direction: column;
        text-align: center;
    }

    .footer-links {
        justify-content: center;
    }
}

/* Espacement pour le header fixe */
.main-content {
    margin-top: 80px;
}

/* Animation pour les transitions */
.nav-link {
    transition: all 0.3s ease;
}

.sign-in-btn {
    transition: all 0.3s ease;
}

/* Loading state */
.loading {
    opacity: 0.6;
    pointer-events: none;
}

/* Error state */
.error {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    margin: 0.5rem 0;
}
`;

// Injecter les styles CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = navigationStyles;
document.head.appendChild(styleSheet);

// Initialiser la navigation
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Exporter pour utilisation globale
window.NavigationManager = NavigationManager;
