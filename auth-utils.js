// ============================================================================
// Auth Utilities - Partagé par toutes les pages
// Gestion centralisée du token, session, et état d'authentification
// ============================================================================

const Auth = {
    TOKEN_KEY: 'authToken',
    USER_KEY: 'userData',

    // Sauvegarder la session après login/register
    saveSession(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    // Récupérer le token
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    // Récupérer l'utilisateur stocké
    getUser() {
        try {
            const data = localStorage.getItem(this.USER_KEY);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    },

    // Alias pour getUser() (compatibilité)
    getUserData() {
        return this.getUser();
    },

    // Vérifier si connecté (côté client, rapide)
    isLoggedIn() {
        return !!this.getToken();
    },

    // Vérifier la session côté serveur
    async verifySession() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const res = await fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                this.clearSession();
                return null;
            }
            const data = await res.json();
            if (data.success && data.user) {
                localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
                return data.user;
            }
            this.clearSession();
            return null;
        } catch {
            return null;
        }
    },

    // Déconnexion
    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch {}
        }
        this.clearSession();
        window.location.href = '/';
    },

    // Nettoyer la session locale
    clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },

    // Fetch authentifié (ajoute le Bearer token automatiquement)
    async apiFetch(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            this.clearSession();
        }
        return res;
    },

    // Rediriger si non connecté
    requireAuth(redirectUrl = '/login') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },

    // Mettre à jour le header/nav selon l'état auth
    updateNav() {
        const user = this.getUser();
        const navAuth = document.getElementById('nav-auth');
        if (!navAuth) return;

        if (user) {
            const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || '');
            navAuth.innerHTML = `
                <a href="/discover" class="nav-link">Discover</a>
                <a href="/favorites" class="nav-link">Favorites</a>
                <a href="/messages" class="nav-link">Messages</a>
                <div class="profile-dropdown" style="position:relative">
                    <div class="profile-icon" onclick="document.getElementById('profile-menu').classList.toggle('show')" 
                         style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1e3a8a);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:0.85rem;cursor:pointer;border:2px solid rgba(255,255,255,0.1)">
                        ${initials || '?'}
                    </div>
                    <div id="profile-menu" class="profile-menu" style="display:none;position:absolute;right:0;top:45px;background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:8px;min-width:180px;z-index:9999;padding:0.5rem 0">
                        <div style="padding:0.75rem 1rem;border-bottom:1px solid rgba(255,255,255,0.08);color:#999;font-size:0.8rem">${user.email || ''}</div>
                        <a href="/settings" style="display:block;padding:0.6rem 1rem;color:#fff;text-decoration:none;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='none'">Settings</a>
                        <a href="/profile" style="display:block;padding:0.6rem 1rem;color:#fff;text-decoration:none;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='none'">My Profile</a>
                        <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:0.25rem;padding-top:0.25rem">
                            <a href="#" onclick="Auth.logout();return false;" style="display:block;padding:0.6rem 1rem;color:#ef4444;text-decoration:none;font-size:0.9rem;transition:background 0.2s" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='none'">Logout</a>
                        </div>
                    </div>
                </div>
            `;
            // Fermer le dropdown quand on clique ailleurs
            document.addEventListener('click', (e) => {
                const menu = document.getElementById('profile-menu');
                if (menu && !e.target.closest('.profile-dropdown')) {
                    menu.style.display = 'none';
                }
            });
            // Toggle show
            const style = document.createElement('style');
            style.textContent = '.profile-menu.show { display: block !important; }';
            document.head.appendChild(style);
        } else {
            navAuth.innerHTML = `
                <a href="/discover" class="nav-link">Discover</a>
                <a href="/login" class="nav-link">Login</a>
                <a href="/signup" class="nav-link nav-btn-primary" style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:0.5rem 1.25rem;border-radius:8px;color:#fff;font-weight:600">Sign Up</a>
            `;
        }
    }
};

// Auto-update nav on page load
document.addEventListener('DOMContentLoaded', () => Auth.updateNav());
