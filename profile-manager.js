/**
 * Système unifié de gestion du profil
 * Connecte toutes les pages au profil utilisateur
 */

class ProfileManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔍 ProfileManager initialisé');
        this.checkAuthStatus();
        this.setupProfileIcons();
        this.setupNavigation();
    }

    // Vérifier si l'utilisateur est connecté
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        const userType = localStorage.getItem('userType');

        console.log('🔍 Auth check:', {
            token: token ? 'Oui' : 'Non',
            userData: userData ? 'Oui' : 'Non',
            userType: userType || 'Non défini'
        });

        if (!token) {
            console.log('❌ Utilisateur non connecté');
            return false;
        }

        return true;
    }

    // Configurer les icônes de profil sur toutes les pages
    setupProfileIcons() {
        const profileIcons = document.querySelectorAll('.profile-icon, #profileInitial, #mobileProfileInitial, #sidebarProfileInitial');
        
        profileIcons.forEach(icon => {
            if (icon) {
                this.setProfileInitial(icon);
                icon.addEventListener('click', () => this.goToProfile());
            }
        });
    }

    // Définir l'initiale du profil
    setProfileInitial(element) {
        const userData = localStorage.getItem('userData');
        
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() :
                               user.email ? user.email.charAt(0).toUpperCase() :
                               user.companyName ? user.companyName.charAt(0).toUpperCase() : 'U';
                
                if (element.tagName === 'IMG') {
                    // Si c'est une image, vérifier s'il y a un avatar
                    if (user.avatarUrl) {
                        element.src = user.avatarUrl;
                        element.style.display = 'block';
                    } else {
                        element.style.display = 'none';
                    }
                } else {
                    element.textContent = initial;
                }
                
                console.log('✅ Initiale du profil définie:', initial);
            } catch (error) {
                console.log('❌ Erreur parsing user data:', error);
                if (element.tagName !== 'IMG') {
                    element.textContent = 'U';
                }
            }
        }
    }

    // Navigation vers le profil approprié
    goToProfile() {
        console.log('🔍 Clic sur l icône profil');
        const userType = localStorage.getItem('userType');
        console.log('🔍 User type:', userType);

        try {
            if (userType === 'TALENT' || userType === 'talent') {
                console.log('🔍 Redirection vers profile-talent.html');
                window.location.href = '/profile-talent.html';
            } else if (userType === 'AGENCY' || userType === 'agency') {
                console.log('🔍 Redirection vers profile-agency.html');
                window.location.href = '/profile-agency.html';
            } else {
                console.log('🔍 Pas de userType, redirection vers discover.html');
                window.location.href = '/discover.html';
            }
        } catch (error) {
            console.error('❌ Erreur de redirection:', error);
        }
    }

    // Configurer la navigation selon le type d'utilisateur
    setupNavigation() {
        const userType = localStorage.getItem('userType');
        
        // Afficher/masquer les éléments selon le type d'utilisateur
        this.setupUserTypeSpecificElements(userType);
        
        // Configurer les liens de navigation
        this.setupNavigationLinks();
    }

    // Éléments spécifiques au type d'utilisateur
    setupUserTypeSpecificElements(userType) {
        // Bouton "Manage" pour les agences
        const manageBtn = document.getElementById('manageBtn');
        if (manageBtn) {
            if (userType === 'AGENCY' || userType === 'agency') {
                manageBtn.style.display = 'block';
                console.log('✅ Bouton Manage AFFICHÉ pour AGENCY');
            } else {
                manageBtn.style.display = 'none';
                console.log('🔒 Bouton Manage MASQUÉ pour userType:', userType);
            }
        }

        // Autres éléments spécifiques
        this.setupTalentSpecificElements(userType);
        this.setupAgencySpecificElements(userType);
    }

    // Éléments spécifiques aux talents
    setupTalentSpecificElements(userType) {
        if (userType === 'TALENT' || userType === 'talent') {
            // Afficher les éléments spécifiques aux talents
            const talentElements = document.querySelectorAll('.talent-only');
            talentElements.forEach(el => el.style.display = 'block');
            
            // Masquer les éléments agences
            const agencyElements = document.querySelectorAll('.agency-only');
            agencyElements.forEach(el => el.style.display = 'none');
        }
    }

    // Éléments spécifiques aux agences
    setupAgencySpecificElements(userType) {
        if (userType === 'AGENCY' || userType === 'agency') {
            // Afficher les éléments spécifiques aux agences
            const agencyElements = document.querySelectorAll('.agency-only');
            agencyElements.forEach(el => el.style.display = 'block');
            
            // Masquer les éléments talents
            const talentElements = document.querySelectorAll('.talent-only');
            talentElements.forEach(el => el.style.display = 'none');
        }
    }

    // Configurer les liens de navigation
    setupNavigationLinks() {
        // Lien "Messages"
        const messagesLinks = document.querySelectorAll('a[href*="messages"], .messages-link');
        messagesLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToMessages();
            });
        });

        // Lien "Discover"
        const discoverLinks = document.querySelectorAll('a[href*="discover"], .discover-link');
        discoverLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToDiscover();
            });
        });

        // Lien "Manage" (agences seulement)
        const manageLinks = document.querySelectorAll('a[href*="manage"], .manage-link');
        manageLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToManage();
            });
        });
    }

    // Navigation vers les messages
    goToMessages() {
        console.log('🔍 Redirection vers /messages');
        window.location.href = '/messages';
    }

    // Navigation vers discover
    goToDiscover() {
        console.log('🔍 Redirection vers discover.html');
        window.location.href = '/discover.html';
    }

    // Navigation vers manage (agences seulement)
    goToManage() {
        const userType = localStorage.getItem('userType');
        if (userType === 'AGENCY' || userType === 'agency') {
            console.log('🔍 Redirection vers manage-agency.html');
            window.location.href = '/manage-agency';
        } else {
            console.log('🔒 Manage réservé aux agences');
            alert('This feature is only available for agencies');
        }
    }

    // Déconnexion
    logout() {
        console.log('🔍 Déconnexion');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userType');
        sessionStorage.clear();
        window.location.href = '/login.html';
    }

    // Vérifier et rediriger si non connecté
    requireAuth() {
        if (!this.checkAuthStatus()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    // Obtenir les données utilisateur actuelles
    getCurrentUser() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // Mettre à jour les données utilisateur
    updateUserData(newData) {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...newData };
            localStorage.setItem('userData', JSON.stringify(updatedUser));
            this.setupProfileIcons(); // Mettre à jour les icônes
        }
    }
}

// Fonctions globales pour compatibilité
window.goToProfile = function() {
    window.profileManager.goToProfile();
};

window.goToMessages = function() {
    window.profileManager.goToMessages();
};

window.goToDiscover = function() {
    window.profileManager.goToDiscover();
};

window.goToManage = function() {
    window.profileManager.goToManage();
};

window.logout = function() {
    window.profileManager.logout();
};

// Initialiser le ProfileManager quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    window.profileManager = new ProfileManager();
});

// Exporter pour utilisation dans d'autres scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}
