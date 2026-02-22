// Système de gestion des fichiers uploadés
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class FileManager {
    constructor() {
        this.uploadsDir = 'uploads/';
        this.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
        this.maxTotalSize = 500 * 1024 * 1024; // 500MB max
        this.stats = {
            totalFiles: 0,
            totalSize: 0,
            filesByType: {},
            lastCleanup: null
        };
        
        // Initialiser le monitoring
        this.initMonitoring();
    }

    // Initialiser le monitoring et le nettoyage automatique
    initMonitoring() {
        // Nettoyage tous les jours à 2h du matin
        cron.schedule('0 2 * * *', () => {
            console.log('🧹 Démarrage du nettoyage automatique des fichiers...');
            this.performCleanup();
        });

        // Monitoring toutes les heures
        cron.schedule('0 * * * *', () => {
            this.updateStats();
            this.checkDiskUsage();
        });

        // Stats au démarrage
        this.updateStats();
    }

    // Mettre à jour les statistiques
    updateStats() {
        try {
            this.stats = {
                totalFiles: 0,
                totalSize: 0,
                filesByType: {},
                lastCleanup: new Date()
            };

            this.walkDirectory(this.uploadsDir, (filePath, stats) => {
                this.stats.totalFiles++;
                this.stats.totalSize += stats.size;
                
                const ext = path.extname(filePath).toLowerCase();
                this.stats.filesByType[ext] = (this.stats.filesByType[ext] || 0) + 1;
            });

            console.log('📊 Stats fichiers:', {
                total: this.stats.totalFiles,
                size: `${(this.stats.totalSize / 1024 / 1024).toFixed(2)}MB`,
                types: this.stats.filesByType
            });

        } catch (error) {
            console.error('❌ Erreur mise à jour stats:', error);
        }
    }

    // Vérifier l'utilisation du disque
    checkDiskUsage() {
        try {
            const usage = process.memoryUsage();
            const diskUsage = this.stats.totalSize;
            
            if (diskUsage > this.maxTotalSize) {
                console.warn('⚠️ Espace disque critique:', {
                    current: `${(diskUsage / 1024 / 1024).toFixed(2)}MB`,
                    max: `${(this.maxTotalSize / 1024 / 1024).toFixed(2)}MB`
                });
                
                // Nettoyage d'urgence
                this.performCleanup(true);
            }
        } catch (error) {
            console.error('❌ Erreur vérification disque:', error);
        }
    }

    // Nettoyage des fichiers
    performCleanup(urgent = false) {
        const maxAge = urgent ? 7 * 24 * 60 * 60 * 1000 : this.maxAge; // 7 jours si urgent
        let deletedCount = 0;
        let freedSpace = 0;

        this.walkDirectory(this.uploadsDir, (filePath, stats) => {
            const age = Date.now() - stats.mtime.getTime();
            
            if (age > maxAge) {
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    freedSpace += stats.size;
                } catch (error) {
                    console.error('❌ Erreur suppression fichier:', filePath, error.message);
                }
            }
        });

        console.log('🧹 Nettoyage terminé:', {
            fichiersSupprimes: deletedCount,
            espaceLibere: `${(freedSpace / 1024 / 1024).toFixed(2)}MB`,
            urgent: urgent
        });

        // Mettre à jour les stats après nettoyage
        this.updateStats();
    }

    // Parcourir récursivement un répertoire
    walkDirectory(dir, callback) {
        try {
            const files = fs.readdirSync(dir);
            
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.isDirectory()) {
                    this.walkDirectory(filePath, callback);
                } else {
                    callback(filePath, stats);
                }
            });
        } catch (error) {
            console.error('❌ Erreur parcours répertoire:', dir, error.message);
        }
    }

    // Optimiser le stockage
    optimizeStorage() {
        console.log('🔧 Optimisation du stockage...');
        
        // Compresser les anciennes images (placeholder pour l'implémentation)
        // Supprimer les fichiers en double
        // Réorganiser les fichiers par date
        
        this.updateStats();
    }

    // Obtenir les statistiques actuelles
    getStats() {
        return {
            ...this.stats,
            maxTotalSize: this.maxTotalSize,
            usagePercentage: (this.stats.totalSize / this.maxTotalSize * 100).toFixed(2)
        };
    }

    // Valider un fichier avant upload
    validateFile(file, category = 'images') {
        const validation = {
            valid: true,
            warnings: [],
            errors: []
        };

        // Vérifier la taille
        if (file.size > 10 * 1024 * 1024) {
            validation.warnings.push('Fichier volumineux, upload plus lent');
        }

        // Vérifier le nom de fichier
        if (file.originalname.length > 100) {
            validation.warnings.push('Nom de fichier très long');
        }

        // Vérifier les caractères spéciaux
        if (!/^[a-zA-Z0-9._-]+$/.test(path.parse(file.originalname).name)) {
            validation.warnings.push('Nom de fichier contient des caractères spéciaux');
        }

        return validation;
    }

    // Créer des dossiers si nécessaire
    ensureDirectories() {
        const directories = [
            'uploads/avatar',      // Singulier pour compatibilité
            'uploads/avatars',     // Nouveau pluriel
            'uploads/video',       // Singulier pour compatibilité
            'uploads/videos',      // Nouveau pluriel
            'uploads/portfolio',
            'uploads/messages',
            'uploads/documents',
            'uploads/general',
            'uploads/temp'
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log('📁 Dossier créé:', dir);
            }
        });
    }
}

// Export du gestionnaire de fichiers
const fileManager = new FileManager();

// Middleware pour le monitoring des uploads
const monitorUpload = (req, res, next) => {
    const startTime = Date.now();
    
    // Intercepter la réponse
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        
        if (req.file && res.statusCode === 200) {
            console.log('📤 Upload monitoring:', {
                user: req.user?.id || 'anonymous',
                file: req.file.originalname,
                size: `${(req.file.size / 1024).toFixed(2)}KB`,
                duration: `${duration}ms`,
                type: req.file.mimetype
            });
            
            // Mettre à jour les stats
            fileManager.updateStats();
        }
        
        originalSend.call(this, data);
    };
    
    next();
};

// Middleware pour limiter les uploads par utilisateur
const rateLimitUpload = (maxUploadsPerHour = 10) => {
    const userUploads = new Map();
    
    return (req, res, next) => {
        const userId = req.user?.id || req.ip;
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        
        // Nettoyer les anciennes entrées
        if (userUploads.has(userId)) {
            const uploads = userUploads.get(userId).filter(time => time > hourAgo);
            userUploads.set(userId, uploads);
        } else {
            userUploads.set(userId, []);
        }
        
        const currentUploads = userUploads.get(userId);
        
        if (currentUploads.length >= maxUploadsPerHour) {
            return res.status(429).json({
                error: 'Trop d\'uploads. Limite: ' + maxUploadsPerHour + ' par heure',
                nextUpload: new Date(Math.min(...currentUploads) + (60 * 60 * 1000))
            });
        }
        
        // Ajouter cet upload
        currentUploads.push(now);
        userUploads.set(userId, currentUploads);
        
        next();
    };
};

module.exports = {
    fileManager,
    monitorUpload,
    rateLimitUpload
};
