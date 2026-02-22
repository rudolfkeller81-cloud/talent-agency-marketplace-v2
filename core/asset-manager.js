// Gestionnaire d'assets et de ressources
class AssetManager {
    constructor() {
        this.loadedAssets = new Set();
        this.loadingAssets = new Map();
        this.assetCache = new Map();
        this.init();
    }

    init() {
        this.setupAssetLoading();
        this.setupImageOptimization();
        this.setupLazyLoading();
        this.setupErrorHandling();
    }

    setupAssetLoading() {
        // Précharger les assets critiques
        this.preloadCriticalAssets();
        
        // Observer le chargement des assets
        this.observeAssetLoading();
    }

    preloadCriticalAssets() {
        const criticalAssets = [
            '/assets/css/main.css',
            '/assets/js/main.js',
            '/assets/images/logo.svg',
            '/assets/images/hero-bg.jpg'
        ];

        criticalAssets.forEach(asset => {
            this.preloadAsset(asset);
        });
    }

    preloadAsset(url) {
        if (this.loadedAssets.has(url)) {
            return Promise.resolve();
        }

        if (this.loadingAssets.has(url)) {
            return this.loadingAssets.get(url);
        }

        const promise = this.loadAsset(url);
        this.loadingAssets.set(url, promise);
        
        return promise.finally(() => {
            this.loadingAssets.delete(url);
            this.loadedAssets.add(url);
        });
    }

    async loadAsset(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load asset: ${url}`);
            }
            
            const asset = await response.blob();
            this.assetCache.set(url, asset);
            return asset;
        } catch (error) {
            console.error('Error loading asset:', url, error);
            throw error;
        }
    }

    observeAssetLoading() {
        // Observer les images et les charger quand elles deviennent visibles
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadImage(img);
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        // Observer toutes les images avec data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;

        // Ajouter un loading state
        img.classList.add('loading');

        // Créer une nouvelle image pour précharger
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            img.classList.remove('loading');
            img.classList.add('loaded');
            img.removeAttribute('data-src');
        };

        tempImg.onerror = () => {
            img.classList.remove('loading');
            img.classList.add('error');
            // Utiliser une image par défaut
            img.src = '/assets/images/placeholder.jpg';
        };

        tempImg.src = src;
    }

    setupImageOptimization() {
        // Optimiser les images au chargement
        this.optimizeImages();
        
        // Configurer les images responsives
        this.setupResponsiveImages();
    }

    optimizeImages() {
        document.querySelectorAll('img').forEach(img => {
            // Ajouter des attributs pour l'optimisation
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }

            if (!img.hasAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }

            // Ajouter des alt tags manquants
            if (!img.hasAttribute('alt')) {
                img.setAttribute('alt', 'Image');
            }
        });
    }

    setupResponsiveImages() {
        document.querySelectorAll('img[srcset]').forEach(img => {
            // S'assurer que les srcset sont correctement configurés
            const srcset = img.getAttribute('srcset');
            if (srcset && !srcset.includes('w')) {
                // Convertir les srcset sans 'w' en format correct
                const sources = srcset.split(',').map(src => {
                    const [url, descriptor] = src.trim().split(' ');
                    return descriptor ? `${url} ${descriptor}` : `${url} 1x`;
                });
                img.setAttribute('srcset', sources.join(', '));
            }
        });
    }

    setupLazyLoading() {
        // Configuration du lazy loading pour les images
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            // Fallback pour les vieux navigateurs
            this.setupFallbackLazyLoading();
        }
    }

    setupIntersectionObserver() {
        const lazyImageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.lazyLoadImage(img);
                    lazyImageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-lazy]').forEach(img => {
            lazyImageObserver.observe(img);
        });
    }

    lazyLoadImage(img) {
        const src = img.dataset.lazy;
        if (!src) return;

        img.src = src;
        img.classList.add('lazy-loaded');
        img.removeAttribute('data-lazy');
    }

    setupFallbackLazyLoading() {
        // Pour les navigateurs sans IntersectionObserver
        setTimeout(() => {
            document.querySelectorAll('img[data-lazy]').forEach(img => {
                this.lazyLoadImage(img);
            });
        }, 1000);
    }

    setupErrorHandling() {
        // Gérer les erreurs de chargement d'assets
        window.addEventListener('error', (event) => {
            if (event.target.tagName === 'IMG') {
                this.handleImageError(event.target);
            }
        }, true);

        // Gérer les erreurs de script
        window.addEventListener('error', (event) => {
            if (event.target.tagName === 'SCRIPT') {
                this.handleScriptError(event.target);
            }
        }, true);
    }

    handleImageError(img) {
        img.classList.add('error');
        
        // Utiliser une image par défaut
        if (!img.hasAttribute('data-error-handled')) {
            img.setAttribute('data-error-handled', 'true');
            img.src = '/assets/images/image-error.jpg';
            img.alt = 'Image non disponible';
        }
    }

    handleScriptError(script) {
        console.error('Script loading error:', script.src);
        // Essayer de recharger le script ou utiliser un fallback
        if (!script.hasAttribute('data-error-handled')) {
            script.setAttribute('data-error-handled', 'true');
            // Logique de rechargement ou fallback ici
        }
    }

    // Méthodes utilitaires
    getAsset(url) {
        return this.assetCache.get(url);
    }

    isAssetLoaded(url) {
        return this.loadedAssets.has(url);
    }

    clearCache() {
        this.assetCache.clear();
        this.loadedAssets.clear();
        this.loadingAssets.clear();
    }

    // Précharger des assets spécifiques
    preloadAssets(urls) {
        return Promise.all(urls.map(url => this.preloadAsset(url)));
    }

    // Obtenir des statistiques sur les assets
    getAssetStats() {
        return {
            loaded: this.loadedAssets.size,
            loading: this.loadingAssets.size,
            cached: this.assetCache.size
        };
    }
}

// Styles pour les assets
const assetStyles = `
/* Image loading states */
img.loading {
    opacity: 0.5;
    filter: blur(5px);
    transition: all 0.3s ease;
}

img.loaded {
    opacity: 1;
    filter: blur(0);
}

img.error {
    opacity: 0.7;
    filter: grayscale(100%);
}

/* Lazy loading transitions */
img[data-lazy] {
    opacity: 0;
    transition: opacity 0.3s ease;
}

img.lazy-loaded {
    opacity: 1;
}

/* Placeholder pour les images en chargement */
.image-placeholder {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
}

@keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Responsive images */
.responsive-image {
    max-width: 100%;
    height: auto;
    object-fit: cover;
}

/* Error states */
.asset-error {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    color: #666;
    font-size: 0.9rem;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
}

/* Performance optimizations */
img {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
}

/* Préload indicators */
.preloading {
    position: relative;
}

.preloading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Injecter les styles
const assetStyleSheet = document.createElement('style');
assetStyleSheet.textContent = assetStyles;
document.head.appendChild(assetStyleSheet);

// Initialiser l'AssetManager
document.addEventListener('DOMContentLoaded', () => {
    window.assetManager = new AssetManager();
});

// Exporter pour utilisation globale
window.AssetManager = AssetManager;
