// Service Worker pour le cache offline et les performances
const CACHE_NAME = 'talent-agency-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// URLs à mettre en cache statique
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/register-test.html',
    '/pages/discover.html',
    '/favorites',
    '/pages/messages.html',
    '/performance.css',
    '/performance-init.js',
    '/lazy-loader.js',
    '/dist/marketplace.min.js',
    'https://ddifdvxghdonoqnmoiyo.supabase.co/rest/v1/',
    'https://unpkg.com/@supabase/supabase-js@2'
];

// Installation du Service Worker
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installation');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Mise en cache des assets statiques');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Forcer l'activation du nouveau Service Worker
                return self.skipWaiting();
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activation');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Supprimer les anciens caches
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('🗑️ Suppression de l\'ancien cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Prendre le contrôle de toutes les pages
                return self.clients.claim();
            })
    );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Stratégie de cache selon le type de requête
    if (request.method === 'GET') {
        if (isAPIRequest(url)) {
            // Cache First pour les API avec stale-while-revalidate
            event.respondWith(cacheFirstWithStaleWhileRevalidate(request, API_CACHE));
        } else if (isStaticAsset(url)) {
            // Cache First pour les assets statiques
            event.respondWith(cacheFirst(request, STATIC_CACHE));
        } else {
            // Network First pour les pages HTML
            event.respondWith(networkFirst(request, DYNAMIC_CACHE));
        }
    }
});

// Vérifier si c'est une requête API
function isAPIRequest(url) {
    return url.pathname.startsWith('/api/') || 
           url.hostname.includes('supabase.co');
}

// Vérifier si c'est un asset statique
function isStaticAsset(url) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Stratégie Cache First
async function cacheFirst(request, cacheName) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('📖 Cache hit:', request.url);
            return cachedResponse;
        }
        
        console.log('🌐 Cache miss, réseau:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('❌ Erreur cacheFirst:', error);
        return new Response('Offline', { status: 503 });
    }
}

// Stratégie Network First
async function networkFirst(request, cacheName) {
    try {
        console.log('🌐 Requête réseau:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('📦 Réseau indisponible, cache fallback:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Page offline pour les requêtes de page
        if (request.mode === 'navigate') {
            return caches.match('/offline.html') || 
                   new Response('Offline - Page non disponible', { status: 503 });
        }
        
        return new Response('Offline', { status: 503 });
    }
}

// Stratégie Cache First avec Stale-While-Revalidate
async function cacheFirstWithStaleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Toujours essayer de mettre à jour le cache en arrière-plan
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.error('❌ Erreur mise à jour cache:', error);
        return cachedResponse || new Response('Offline', { status: 503 });
    });
    
    // Retourner le cache immédiatement si disponible
    if (cachedResponse) {
        console.log('📖 Cache hit (stale):', request.url);
        return cachedResponse;
    }
    
    // Sinon attendre la réponse réseau
    console.log('🌐 Cache miss, attente réseau:', request.url);
    return fetchPromise;
}

// Gestion des messages du client
self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_UPDATE':
            updateCache(payload.urls);
            break;
            
        case 'CACHE_CLEAR':
            clearCache(payload.cacheName);
            break;
            
        case 'GET_CACHE_STATS':
            getCacheStats().then(stats => {
                event.ports[0].postMessage({ type: 'CACHE_STATS', payload: stats });
            });
            break;
    }
});

// Mettre à jour le cache pour des URLs spécifiques
async function updateCache(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log('🔄 Cache mis à jour:', url);
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour cache:', url, error);
        }
    }
}

// Vider un cache spécifique
async function clearCache(cacheName) {
    try {
        await caches.delete(cacheName);
        console.log('🗑️ Cache vidé:', cacheName);
        return true;
    } catch (error) {
        console.error('❌ Erreur vidage cache:', error);
        return false;
    }
}

// Obtenir les statistiques du cache
async function getCacheStats() {
    const cacheNames = await caches.keys();
    const stats = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const size = keys.length;
        
        stats[cacheName] = {
            size: size,
            urls: keys.map(request => request.url)
        };
    }
    
    return stats;
}

// Background Sync pour les actions offline
self.addEventListener('sync', event => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'background-sync-messages') {
        event.waitUntil(syncMessages());
    } else if (event.tag === 'background-sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

// Synchroniser les messages en attente
async function syncMessages() {
    try {
        // Récupérer les messages en attente depuis IndexedDB
        const pendingMessages = await getPendingMessages();
        
        for (const message of pendingMessages) {
            try {
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${message.token}`
                    },
                    body: JSON.stringify(message.data)
                });
                
                if (response.ok) {
                    // Supprimer le message de IndexedDB
                    await deletePendingMessage(message.id);
                    console.log('✅ Message synchronisé:', message.id);
                }
            } catch (error) {
                console.error('❌ Erreur synchronisation message:', error);
            }
        }
    } catch (error) {
        console.error('❌ Erreur sync messages:', error);
    }
}

// Synchroniser les favoris en attente
async function syncFavorites() {
    try {
        const pendingFavorites = await getPendingFavorites();
        
        for (const favorite of pendingFavorites) {
            try {
                const response = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${favorite.token}`
                    },
                    body: JSON.stringify(favorite.data)
                });
                
                if (response.ok) {
                    await deletePendingFavorite(favorite.id);
                    console.log('✅ Favori synchronisé:', favorite.id);
                }
            } catch (error) {
                console.error('❌ Erreur synchronisation favori:', error);
            }
        }
    } catch (error) {
        console.error('❌ Erreur sync favoris:', error);
    }
}

// Fonctions IndexedDB (simplifiées)
async function getPendingMessages() {
    // Implémentation avec IndexedDB pour stocker les messages en attente
    return [];
}

async function deletePendingMessage(id) {
    // Implémentation IndexedDB
}

async function getPendingFavorites() {
    // Implémentation IndexedDB
    return [];
}

async function deletePendingFavorite(id) {
    // Implémentation IndexedDB
}

// Push notifications
self.addEventListener('push', event => {
    console.log('📢 Push notification reçue');
    
    const options = {
        body: event.data ? event.data.text() : 'Nouvelle notification',
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Voir',
                icon: '/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Fermer',
                icon: '/images/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Talent & Agency', options)
    );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Notification cliquée:', event.notification.data);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        // Ouvrir l'application
        event.waitUntil(
            clients.openWindow('/messages')
        );
    }
});

console.log('🚀 Service Worker chargé');
