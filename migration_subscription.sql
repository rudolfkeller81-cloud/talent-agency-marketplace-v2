-- Migration pour ajouter les champs d'abonnement manquants
-- Exécuter cette commande: sqlite3 talent_agency.db < migration_subscription.sql

-- Ajouter les champs manquants à la table users
ALTER TABLE users ADD COLUMN subscription_active BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN plan_type VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);

-- Mettre à jour les utilisateurs existants
UPDATE users SET subscription_active = FALSE WHERE subscription_active IS NULL;
UPDATE users SET plan_type = 'free' WHERE plan_type IS NULL;
UPDATE users SET subscription_status = 'inactive' WHERE subscription_status IS NULL;
