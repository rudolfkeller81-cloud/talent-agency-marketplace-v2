// Client Supabase
class SupabaseClient {
    constructor() {
        this.client = null;
        this.init();
    }

    init() {
        try {
            // Charger la configuration
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2';
            script.onload = () => {
                this.setupClient();
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('Erreur chargement Supabase:', error);
        }
    }

    setupClient() {
        try {
            // Récupérer la configuration
            const config = window.SUPABASE_CONFIG;
            if (!config || !config.url || !config.anonKey) {
                console.error('Configuration Supabase manquante');
                return;
            }

            // Créer le client
            const { createClient } = window.supabase;
            this.client = createClient(config.url, config.anonKey);
            
            console.log('✅ Supabase connecté avec succès!');
            
            // Déclencher l'événement de connexion
            window.dispatchEvent(new CustomEvent('supabaseReady'));
            
        } catch (error) {
            console.error('Erreur setup Supabase:', error);
        }
    }

    // Méthodes utilitaires
    async signUp(email, password) {
        if (!this.client) return { error: 'Client non initialisé' };
        return await this.client.auth.signUp({ email, password });
    }

    async signIn(email, password) {
        if (!this.client) return { error: 'Client non initialisé' };
        return await this.client.auth.signInWithPassword({ email, password });
    }

    async signOut() {
        if (!this.client) return { error: 'Client non initialisé' };
        return await this.client.auth.signOut();
    }

    async getCurrentUser() {
        if (!this.client) return { error: 'Client non initialisé' };
        return await this.client.auth.getUser();
    }

    // CRUD pour les tables
    async select(table, options = {}) {
        if (!this.client) return { error: 'Client non initialisé' };
        let query = this.client.from(table);
        
        if (options.select) query = query.select(options.select);
        if (options.eq) query = query.eq(options.eq.column, options.eq.value);
        if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending });
        if (options.limit) query = query.limit(options.limit);
        
        return await query;
    }

    async insert(table, data) {
        if (!this.client) return { error: 'Client non initialisé' };
        return await this.client.from(table).insert(data);
    }

    async update(table, data, condition) {
        if (!this.client) return { error: 'Client non initialisé' };
        let query = this.client.from(table).update(data);
        if (condition) query = query.eq(condition.column, condition.value);
        return await query;
    }

    async delete(table, condition) {
        if (!this.client) return { error: 'Client non initialisé' };
        let query = this.client.from(table).delete();
        if (condition) query = query.eq(condition.column, condition.value);
        return await query;
    }
}

// Créer l'instance globale
window.supabaseClient = new SupabaseClient();
