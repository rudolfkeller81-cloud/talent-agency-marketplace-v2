const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Types de fichiers autorisés avec validation stricte
const ALLOWED_FILE_TYPES = {
    images: {
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
        maxSize: 10 * 1024 * 1024, // 10MB
        maxCount: 5
    },
    videos: {
        mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
        extensions: ['.mp4', '.webm', '.mov', '.avi'],
        maxSize: 50 * 1024 * 1024, // 50MB
        maxCount: 1
    },
    documents: {
        mimeTypes: ['application/pdf', 'text/plain'],
        extensions: ['.pdf', '.txt'],
        maxSize: 5 * 1024 * 1024, // 5MB
        maxCount: 3
    }
};

// Validation avancée du type de fichier
const validateFileType = (file, category) => {
    const config = ALLOWED_FILE_TYPES[category];
    if (!config) {
        return { valid: false, error: 'Catégorie de fichier non supportée' };
    }

    // Vérifier le MIME type
    if (!config.mimeTypes.includes(file.mimetype)) {
        return { 
            valid: false, 
            error: `Type MIME non supporté. Types autorisés: ${config.mimeTypes.join(', ')}` 
        };
    }

    // Vérifier l'extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!config.extensions.includes(ext)) {
        return { 
            valid: false, 
            error: `Extension non supportée. Extensions autorisées: ${config.extensions.join(', ')}` 
        };
    }

    // Vérifier la taille
    if (file.size > config.maxSize) {
        return { 
            valid: false, 
            error: `Fichier trop volumineux. Taille max: ${config.maxSize / 1024 / 1024}MB` 
        };
    }

    return { valid: true };
};

// Génération de nom de fichier sécurisé
const generateSecureFilename = (originalname, userId) => {
    const ext = path.extname(originalname).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('md5').update(`${userId}-${timestamp}-${random}`).digest('hex').substring(0, 8);
    
    return `${hash}-${timestamp}${ext}`;
};

// Configuration du stockage améliorée
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/';
        
        // Déterminer le dossier selon le type de fichier
        const type = req.body.type || 'images';
        
        if (type === 'avatar') {
            uploadPath += 'avatars/';
        } else if (type === 'video') {
            uploadPath += 'videos/';
        } else if (type === 'portfolio') {
            uploadPath += 'portfolio/';
        } else if (req.originalUrl && req.originalUrl.includes('/messages/upload')) {
            uploadPath += 'messages/';
        } else if (type === 'documents') {
            uploadPath += 'documents/';
        } else {
            uploadPath += 'general/';
        }
        
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const userId = req.user?.id || 'anonymous';
        const secureFilename = generateSecureFilename(file.originalname, userId);
        cb(null, secureFilename);
    }
});

// Filtre de fichier amélioré
const fileFilter = (req, file, cb) => {
    const type = req.body.type || 'images';
    
    // Déterminer la catégorie
    let category = 'images';
    if (type === 'video' || file.mimetype.startsWith('video/')) {
        category = 'videos';
    } else if (type === 'documents' || file.mimetype.startsWith('application/')) {
        category = 'documents';
    }
    
    const validation = validateFileType(file, category);
    
    if (validation.valid) {
        cb(null, true);
    } else {
        cb(new Error(validation.error), false);
    }
};

// Configuration de Multer avec limites dynamiques
const createUpload = (maxFiles = 1, category = 'images') => {
    return multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: ALLOWED_FILE_TYPES[category]?.maxSize || 10 * 1024 * 1024,
            files: maxFiles
        }
    });
};

// Middleware pour l'upload d'avatar
const uploadAvatar = createUpload(1, 'images').single('avatar');

// Middleware pour l'upload de vidéo
const uploadVideo = createUpload(1, 'videos').single('video');

// Middleware pour l'upload de portfolio (plusieurs images)
const uploadPortfolio = createUpload(5, 'images').array('portfolio', 5);

// Middleware pour l'upload de documents
const uploadDocuments = createUpload(3, 'documents').array('documents', 3);

// Middleware pour les messages
const uploadMessageFiles = createUpload(3, 'images').array('file', 3);

// Fonction pour supprimer un fichier avec vérification
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            // Vérifier que le fichier est dans le dossier uploads
            const normalizedPath = path.normalize(filePath);
            if (!normalizedPath.includes('uploads/')) {
                console.error('Tentative de suppression hors du dossier uploads:', filePath);
                return false;
            }
            
            fs.unlinkSync(filePath);
            console.log('Fichier supprimé:', filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur suppression fichier:', error);
        return false;
    }
};

// Fonction pour obtenir l'URL publique d'un fichier
const getFileUrl = (filePath) => {
    try {
        const relativePath = filePath.split('uploads/')[1];
        if (!relativePath) {
            throw new Error('Chemin de fichier invalide');
        }
        return `/uploads/${relativePath}`;
    } catch (error) {
        console.error('Erreur génération URL:', error);
        return null;
    }
};

// Fonction pour nettoyer les anciens fichiers
const cleanupOldFiles = (maxAge = 30 * 24 * 60 * 60 * 1000) => { // 30 jours par défaut
    const uploadsDir = 'uploads/';
    
    const walkDir = (dir, callback) => {
        fs.readdir(dir, (err, files) => {
            if (err) return;
            
            files.forEach(file => {
                const filePath = path.join(dir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    
                    if (stats.isDirectory()) {
                        walkDir(filePath, callback);
                    } else {
                        const age = Date.now() - stats.mtime.getTime();
                        if (age > maxAge) {
                            callback(filePath);
                        }
                    }
                });
            });
        });
    };
    
    walkDir(uploadsDir, (filePath) => {
        deleteFile(filePath);
        console.log('Ancien fichier supprimé:', filePath);
    });
};

// Fonction pour vérifier l'intégrité d'un fichier
const verifyFileIntegrity = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        const hash = crypto.createHash('sha256');
        const fileBuffer = fs.readFileSync(filePath);
        hash.update(fileBuffer);
        
        return {
            size: stats.size,
            hash: hash.digest('hex'),
            lastModified: stats.mtime,
            exists: true
        };
    } catch (error) {
        return { exists: false, error: error.message };
    }
};

// Middleware pour logger les uploads
const logUpload = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        if (req.file && res.statusCode === 200) {
            console.log('📁 Upload réussi:', {
                user: req.user?.id || 'anonymous',
                file: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype,
                path: req.file.path
            });
        }
        originalSend.call(this, data);
    };
    
    next();
};

module.exports = {
    uploadAvatar,
    uploadVideo,
    uploadPortfolio,
    uploadDocuments,
    uploadMessageFiles,
    deleteFile,
    getFileUrl,
    cleanupOldFiles,
    verifyFileIntegrity,
    logUpload,
    createUpload,
    ALLOWED_FILE_TYPES
};
