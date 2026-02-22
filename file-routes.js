// API endpoints pour la gestion des fichiers
const express = require('express');
const router = express.Router();
const { fileManager, monitorUpload, rateLimitUpload } = require('./file-manager');
const { uploadAvatar, uploadVideo, uploadPortfolio, uploadDocuments, deleteFile, getFileUrl, verifyFileIntegrity } = require('./upload-improved');
const { requireAuth } = require('./auth');

// Middleware pour tous les endpoints de fichiers
router.use(requireAuth);
router.use(monitorUpload);
router.use(rateLimitUpload(20)); // 20 uploads par heure par utilisateur

// Endpoint pour uploader un avatar
router.post('/avatar', uploadAvatar, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const fileUrl = getFileUrl(req.file.path);
        const integrity = verifyFileIntegrity(req.file.path);

        res.json({
            success: true,
            file: {
                originalName: req.file.originalname,
                fileName: req.file.filename,
                path: fileUrl,
                size: req.file.size,
                mimetype: req.file.mimetype,
                integrity: integrity
            }
        });

    } catch (error) {
        console.error('❌ Erreur upload avatar:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload de l\'avatar' });
    }
});

// Endpoint pour uploader une vidéo
router.post('/video', uploadVideo, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const fileUrl = getFileUrl(req.file.path);
        const integrity = verifyFileIntegrity(req.file.path);

        res.json({
            success: true,
            file: {
                originalName: req.file.originalname,
                fileName: req.file.filename,
                path: fileUrl,
                size: req.file.size,
                mimetype: req.file.mimetype,
                integrity: integrity,
                duration: req.body.duration || null // Pour les vidéos
            }
        });

    } catch (error) {
        console.error('❌ Erreur upload vidéo:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload de la vidéo' });
    }
});

// Endpoint pour uploader des fichiers portfolio
router.post('/portfolio', uploadPortfolio, (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const uploadedFiles = req.files.map(file => {
            const fileUrl = getFileUrl(file.path);
            const integrity = verifyFileIntegrity(file.path);
            
            return {
                originalName: file.originalname,
                fileName: file.filename,
                path: fileUrl,
                size: file.size,
                mimetype: file.mimetype,
                integrity: integrity
            };
        });

        res.json({
            success: true,
            files: uploadedFiles,
            count: uploadedFiles.length
        });

    } catch (error) {
        console.error('❌ Erreur upload portfolio:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload du portfolio' });
    }
});

// Endpoint pour uploader des documents
router.post('/documents', uploadDocuments, (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const uploadedFiles = req.files.map(file => {
            const fileUrl = getFileUrl(file.path);
            const integrity = verifyFileIntegrity(file.path);
            
            return {
                originalName: file.originalname,
                fileName: file.filename,
                path: fileUrl,
                size: file.size,
                mimetype: file.mimetype,
                integrity: integrity
            };
        });

        res.json({
            success: true,
            files: uploadedFiles,
            count: uploadedFiles.length
        });

    } catch (error) {
        console.error('❌ Erreur upload documents:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload des documents' });
    }
});

// Endpoint pour supprimer un fichier
router.delete('/file/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Validation du nom de fichier pour éviter la traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Nom de fichier invalide' });
        }

        // Rechercher le fichier dans tous les sous-dossiers
        const uploadsDir = 'uploads/';
        let filePath = null;
        let found = false;

        const searchFile = (dir) => {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stats = fs.statSync(fullPath);
                    
                    if (stats.isDirectory()) {
                        searchFile(fullPath);
                    } else if (file === filename) {
                        filePath = fullPath;
                        found = true;
                        return;
                    }
                }
            } catch (error) {
                // Ignorer les erreurs de lecture
            }
        };

        searchFile(uploadsDir);

        if (!found || !filePath) {
            return res.status(404).json({ error: 'Fichier non trouvé' });
        }

        // Vérifier que l'utilisateur a le droit de supprimer ce fichier
        // (ici on suppose que l'utilisateur peut supprimer ses propres fichiers)
        const deleted = deleteFile(filePath);
        
        if (deleted) {
            res.json({ success: true, message: 'Fichier supprimé avec succès' });
            fileManager.updateStats(); // Mettre à jour les stats
        } else {
            res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
        }

    } catch (error) {
        console.error('❌ Erreur suppression fichier:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
    }
});

// Endpoint pour obtenir les informations d'un fichier
router.get('/file/:filename/info', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Validation du nom de fichier
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Nom de fichier invalide' });
        }

        // Rechercher le fichier
        const uploadsDir = 'uploads/';
        let filePath = null;
        let found = false;

        const searchFile = (dir) => {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stats = fs.statSync(fullPath);
                    
                    if (stats.isDirectory()) {
                        searchFile(fullPath);
                    } else if (file === filename) {
                        filePath = fullPath;
                        found = true;
                        return;
                    }
                }
            } catch (error) {
                // Ignorer les erreurs de lecture
            }
        };

        searchFile(uploadsDir);

        if (!found || !filePath) {
            return res.status(404).json({ error: 'Fichier non trouvé' });
        }

        const integrity = verifyFileIntegrity(filePath);
        const fileUrl = getFileUrl(filePath);

        res.json({
            success: true,
            file: {
                filename: filename,
                path: fileUrl,
                integrity: integrity,
                accessible: true
            }
        });

    } catch (error) {
        console.error('❌ Erreur info fichier:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des informations du fichier' });
    }
});

// Endpoint pour obtenir les statistiques des uploads (admin seulement)
router.get('/stats', (req, res) => {
    try {
        // Vérifier si l'utilisateur est admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const stats = fileManager.getStats();
        
        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('❌ Erreur stats uploads:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

// Endpoint pour déclencher un nettoyage manuel (admin seulement)
router.post('/cleanup', (req, res) => {
    try {
        // Vérifier si l'utilisateur est admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        fileManager.performCleanup();
        
        res.json({
            success: true,
            message: 'Nettoyage déclenché avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur nettoyage:', error);
        res.status(500).json({ error: 'Erreur lors du nettoyage' });
    }
});

// Endpoint pour vérifier l'intégrité de tous les fichiers (admin seulement)
router.get('/integrity', async (req, res) => {
    try {
        // Vérifier si l'utilisateur est admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const results = [];
        const uploadsDir = 'uploads/';

        const checkIntegrity = (dir) => {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stats = fs.statSync(fullPath);
                    
                    if (stats.isDirectory()) {
                        checkIntegrity(fullPath);
                    } else {
                        const integrity = verifyFileIntegrity(fullPath);
                        results.push({
                            file: file,
                            path: fullPath,
                            integrity: integrity
                        });
                    }
                }
            } catch (error) {
                results.push({
                    file: 'error',
                    path: dir,
                    error: error.message
                });
            }
        };

        checkIntegrity(uploadsDir);

        res.json({
            success: true,
            results: results,
            total: results.length
        });

    } catch (error) {
        console.error('❌ Erreur vérification intégrité:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification de l\'intégrité' });
    }
});

module.exports = router;
