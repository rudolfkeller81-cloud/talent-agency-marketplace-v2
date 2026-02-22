// Template de page HTML unifié
class PageTemplate {
    constructor() {
        this.defaultMeta = {
            title: 'Talent & Agency - Professional Marketplace',
            description: 'La marketplace professionnelle où les créateurs de contenu rencontrent les opportunités qui transforment leur carrière',
            keywords: 'talent, agency, marketplace, créateurs, agences, professionnel',
            author: 'Talent & Agency',
            charset: 'UTF-8',
            viewport: 'width=device-width, initial-scale=1.0',
            language: 'fr'
        };
    }

    // Générer le head HTML
    generateHead(meta = {}) {
        const mergedMeta = { ...this.defaultMeta, ...meta };
        
        return `
        <head>
            <meta charset="${mergedMeta.charset}">
            <meta name="viewport" content="${mergedMeta.viewport}">
            <meta name="description" content="${mergedMeta.description}">
            <meta name="keywords" content="${mergedMeta.keywords}">
            <meta name="author" content="${mergedMeta.author}">
            <meta name="robots" content="index, follow">
            <meta property="og:title" content="${mergedMeta.title}">
            <meta property="og:description" content="${mergedMeta.description}">
            <meta property="og:type" content="website">
            <meta property="og:url" content="${window.location.origin}${window.location.pathname}">
            <meta property="og:image" content="${window.location.origin}/assets/images/og-image.jpg">
            <meta property="og:site_name" content="Talent & Agency">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${mergedMeta.title}">
            <meta name="twitter:description" content="${mergedMeta.description}">
            <meta name="twitter:image" content="${window.location.origin}/assets/images/twitter-image.jpg">
            
            <title>${mergedMeta.title}</title>
            
            <!-- Favicon -->
            <link rel="icon" type="image/x-icon" href="/assets/images/favicon.ico">
            <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
            <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
            <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png">
            
            <!-- Preconnect aux domaines externes -->
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link rel="preconnect" href="https://api.stripe.com">
            
            <!-- Fonts -->
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            
            <!-- CSS Core -->
            <link rel="stylesheet" href="/assets/css/reset.css">
            <link rel="stylesheet" href="/assets/css/variables.css">
            <link rel="stylesheet" href="/assets/css/components.css">
            <link rel="stylesheet" href="/assets/css/layout.css">
            <link rel="stylesheet" href="/assets/css/utilities.css">
            
            <!-- CSS Page spécifique -->
            <link rel="stylesheet" href="/assets/css/pages${window.location.pathname}.css">
            
            <!-- JS Core -->
            <script src="/core/navigation.js" defer></script>
            <script src="/core/asset-manager.js" defer></script>
            <script src="/core/auth-manager.js" defer></script>
            
            <!-- JSON-LD pour SEO -->
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "Talent & Agency",
                "description": "${mergedMeta.description}",
                "url": "${window.location.origin}",
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": "${window.location.origin}/discover?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                }
            }
            </script>
        </head>`;
    }

    // Générer le header
    generateHeader() {
        return `
        <header class="header" role="banner">
            <nav class="nav" role="navigation" aria-label="Navigation principale">
                <div class="logo">
                    <div class="logo-icon" aria-hidden="true">T&A</div>
                    <span>Talent & Agency</span>
                </div>
                <ul class="nav-links" id="navLinks">
                    <li><a href="/" class="nav-link" aria-current="page">Accueil</a></li>
                    <li><a href="/discover" class="nav-link">Découvrir</a></li>
                    <li><a href="/favorites" class="nav-link">Favoris</a></li>
                    <li><a href="/messages" class="nav-link">Messages</a></li>
                    <li><a href="/dashboard" class="nav-link">Tableau de bord</a></li>
                    <li><a href="/billing" class="nav-link">Facturation</a></li>
                </ul>
                <div class="nav-actions">
                    <button class="sign-in-btn" id="authBtn" aria-label="Connexion/Déconnexion">Se connecter</button>
                    <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu mobile" aria-expanded="false">☰</button>
                </div>
            </nav>
        </header>`;
    }

    // Générer le footer
    generateFooter() {
        return `
        <footer class="footer" role="contentinfo">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>Talent & Agency</h3>
                    <p>La marketplace professionnelle pour les talents créatifs et les agences.</p>
                    <div class="social-links">
                        <a href="#" aria-label="Facebook" class="social-link">📘</a>
                        <a href="#" aria-label="Twitter" class="social-link">🐦</a>
                        <a href="#" aria-label="LinkedIn" class="social-link">💼</a>
                        <a href="#" aria-label="Instagram" class="social-link">📷</a>
                    </div>
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
        </footer>`;
    }

    // Générer le squelette de page
    generatePage(content, meta = {}) {
        return `
        <!DOCTYPE html>
        <html lang="${meta.language || 'fr'}">
            ${this.generateHead(meta)}
            <body>
                ${this.generateHeader()}
                
                <main class="main-content" role="main">
                    ${content}
                </main>
                
                ${this.generateFooter()}
                
                <!-- Scripts de page -->
                <script src="/assets/js/pages${window.location.pathname}.js" defer></script>
                
                <!-- Analytics -->
                <script>
                    // Google Analytics ou autre analytics
                    if (window.location.hostname !== 'localhost') {
                        // Analytics code here
                    }
                </script>
            </body>
        </html>`;
    }

    // Mettre à jour le titre de la page
    updateTitle(title) {
        document.title = title;
        document.querySelector('meta[property="og:title"]').content = title;
        document.querySelector('meta[name="twitter:title"]').content = title;
    }

    // Mettre à jour la description
    updateDescription(description) {
        document.querySelector('meta[name="description"]').content = description;
        document.querySelector('meta[property="og:description"]').content = description;
        document.querySelector('meta[name="twitter:description"]').content = description;
    }

    // Ajouter des meta tags dynamiques
    addMetaTag(name, content, property = null) {
        const meta = document.createElement('meta');
        if (property) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', name);
        }
        meta.content = content;
        document.head.appendChild(meta);
    }

    // Créer un breadcrumb
    generateBreadcrumb(items) {
        const breadcrumbHTML = items.map((item, index) => {
            const isLast = index === items.length - 1;
            if (isLast) {
                return `<span class="breadcrumb-current" aria-current="page">${item.label}</span>`;
            } else {
                return `<a href="${item.url}" class="breadcrumb-link">${item.label}</a>`;
            }
        }).join('<span class="breadcrumb-separator" aria-hidden="true">›</span>');

        return `
        <nav class="breadcrumb" aria-label="Fil d'Ariane">
            <ol class="breadcrumb-list">
                <li class="breadcrumb-item">
                    <a href="/" class="breadcrumb-link">Accueil</a>
                </li>
                <li class="breadcrumb-item">
                    ${breadcrumbHTML}
                </li>
            </ol>
        </nav>`;
    }
}

// Gestionnaire de pages
class PageManager {
    constructor() {
        this.template = new PageTemplate();
        this.currentPage = window.location.pathname;
        this.pageTitle = '';
        this.pageDescription = '';
        this.init();
    }

    init() {
        this.setupPageMeta();
        this.setupStructuredData();
        this.setupAccessibility();
        this.setupPerformance();
    }

    setupPageMeta() {
        // Extraire les informations de la page
        this.extractPageInfo();
        
        // Mettre à jour les meta tags
        this.updatePageMeta();
    }

    extractPageInfo() {
        // Extraire le titre de la page
        const titleElement = document.querySelector('h1, .page-title, .title');
        if (titleElement) {
            this.pageTitle = titleElement.textContent.trim();
        }

        // Extraire la description
        const descriptionElement = document.querySelector('.page-description, .description, meta[name="description"]');
        if (descriptionElement) {
            this.pageDescription = descriptionElement.textContent.trim() || descriptionElement.getAttribute('content');
        }
    }

    updatePageMeta() {
        if (this.pageTitle) {
            this.template.updateTitle(`${this.pageTitle} | Talent & Agency`);
        }

        if (this.pageDescription) {
            this.template.updateDescription(this.pageDescription);
        }

        // Ajouter des meta tags spécifiques à la page
        this.addPageSpecificMeta();
    }

    addPageSpecificMeta() {
        const pageType = this.getPageType();
        
        switch (pageType) {
            case 'home':
                this.template.addMetaTag('og:type', 'website', 'og:type');
                break;
            case 'profile':
                this.template.addMetaTag('og:type', 'profile', 'og:type');
                break;
            case 'article':
                this.template.addMetaTag('og:type', 'article', 'og:type');
                break;
            default:
                this.template.addMetaTag('og:type', 'website', 'og:type');
        }
    }

    getPageType() {
        const path = window.location.pathname;
        
        if (path === '/' || path === '/index.html') {
            return 'home';
        } else if (path.includes('/discover')) {
            return 'search';
        } else if (path.includes('/profile') || path.includes('/dashboard')) {
            return 'profile';
        } else if (path.includes('/messages')) {
            return 'message';
        } else if (path.includes('/blog')) {
            return 'article';
        }
        
        return 'website';
    }

    setupStructuredData() {
        // Ajouter des données structurées spécifiques à la page
        const pageType = this.getPageType();
        
        switch (pageType) {
            case 'home':
                this.addHomeStructuredData();
                break;
            case 'search':
                this.addSearchStructuredData();
                break;
            case 'profile':
                this.addProfileStructuredData();
                break;
        }
    }

    addHomeStructuredData() {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Talent & Agency",
            "url": window.location.origin,
            "description": this.pageDescription,
            "potentialAction": {
                "@type": "SearchAction",
                "target": `${window.location.origin}/discover?q={search_term_string}`,
                "query-input": "required name=search_term_string"
            }
        };

        this.addStructuredDataScript(structuredData);
    }

    addSearchStructuredData() {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "SearchResultsPage",
            "name": "Résultats de recherche",
            "description": this.pageDescription,
            "url": window.location.href
        };

        this.addStructuredDataScript(structuredData);
    }

    addProfileStructuredData() {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "name": this.pageTitle,
            "description": this.pageDescription,
            "url": window.location.href
        };

        this.addStructuredDataScript(structuredData);
    }

    addStructuredDataScript(data) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    }

    setupAccessibility() {
        // Améliorer l'accessibilité
        this.setupSkipLinks();
        this.setupAriaLabels();
        this.setupKeyboardNavigation();
    }

    setupSkipLinks() {
        // Ajouter des liens d'évitement
        const skipLinksHTML = `
        <div class="skip-links">
            <a href="#main-content" class="skip-link">Aller au contenu principal</a>
            <a href="#navigation" class="skip-link">Aller à la navigation</a>
            <a href="#footer" class="skip-link">Aller au pied de page</a>
        </div>`;
        
        document.body.insertAdjacentHTML('afterbegin', skipLinksHTML);
    }

    setupAriaLabels() {
        // Ajouter des labels ARIA manquants
        const mainContent = document.querySelector('main, .main-content');
        if (mainContent && !mainContent.hasAttribute('id')) {
            mainContent.id = 'main-content';
        }

        const navigation = document.querySelector('nav, .nav');
        if (navigation && !navigation.hasAttribute('id')) {
            navigation.id = 'navigation';
        }

        const footer = document.querySelector('footer, .footer');
        if (footer && !footer.hasAttribute('id')) {
            footer.id = 'footer';
        }
    }

    setupKeyboardNavigation() {
        // Améliorer la navigation au clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    setupPerformance() {
        // Optimiser les performances
        this.setupResourceHints();
        this.setupCriticalResourceLoading();
    }

    setupResourceHints() {
        // Ajouter des hints pour les ressources
        const hints = [
            { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
            { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
            { rel: 'dns-prefetch', href: '//api.stripe.com' },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }
        ];

        hints.forEach(hint => {
            const link = document.createElement('link');
            link.rel = hint.rel;
            link.href = hint.href;
            if (hint.crossorigin) {
                link.crossOrigin = hint.crossorigin;
            }
            document.head.appendChild(link);
        });
    }

    setupCriticalResourceLoading() {
        // Marquer les ressources critiques
        const criticalImages = document.querySelectorAll('img[data-critical]');
        criticalImages.forEach(img => {
            img.setAttribute('loading', 'eager');
            img.setAttribute('decoding', 'sync');
        });
    }
}

// Initialiser le PageManager
document.addEventListener('DOMContentLoaded', () => {
    window.pageManager = new PageManager();
});

// Exporter pour utilisation globale
window.PageTemplate = PageTemplate;
window.PageManager = PageManager;
