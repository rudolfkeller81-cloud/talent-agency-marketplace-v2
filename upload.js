const multer = require('multer')
const logger = require('./logger');
const path = require('path');
const fs = require('fs');

// Déterminer le mode de stockage
const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

let storage;

if (useCloudinary) {
    // Production : Cloudinary
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: async (req, file) => {
            let folder = 'talent-agency/uploads';
            let resourceType = 'image';
            
            if (req.body.type === 'avatar') folder = 'talent-agency/avatars';
            else if (req.body.type === 'video') { folder = 'talent-agency/videos'; resourceType = 'video'; }
            else if (req.body.type === 'portfolio') folder = 'talent-agency/portfolio';
            else if (req.route && req.route.path && req.route.path.includes('/messages/upload')) folder = 'talent-agency/messages';
            
            return {
                folder,
                resource_type: resourceType,
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'],
            };
        }
    });
    
    logger.info('Uploads configurés avec Cloudinary');
} else {
    // Dev local : stockage disque
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            let uploadPath = 'uploads/';
            
            if (req.body.type === 'avatar') uploadPath += 'avatars/';
            else if (req.body.type === 'video') uploadPath += 'videos/';
            else if (req.body.type === 'portfolio') uploadPath += 'portfolio/';
            else if (req.originalname && req.route && req.route.path.includes('/messages/upload')) uploadPath += 'messages/';
            
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    });
    
    logger.info('Uploads configurés en local (disque)');
}

// Filtre pour accepter seulement certains types de fichiers
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    
    if (req.body.type === 'video') {
        if (allowedVideoTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format de vidéo non supporté (MP4, WebM, MOV uniquement)'), false);
        }
    } else {
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format d\'image non supporté (JPEG, PNG, WebP uniquement)'), false);
        }
    }
};

// Configuration de Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: function (req, file, cb) {
            if (req.body.type === 'video') {
                cb(null, 50 * 1024 * 1024); // 50MB pour les vidéos
            } else {
                cb(null, 10 * 1024 * 1024); // 10MB pour les images
            }
        }
    }
});

// Middleware pour l'upload d'avatar
const uploadAvatar = upload.single('avatar');

// Middleware pour l'upload de vidéo
const uploadVideo = upload.single('video');

// Middleware pour l'upload de portfolio (plusieurs images)
const uploadPortfolio = upload.array('portfolio', 5); // Max 5 images

// Fonction pour supprimer un fichier
const deleteFile = (filePath) => {
    if (useCloudinary) {
        // Cloudinary : extraire le public_id de l'URL et supprimer
        try {
            const cloudinary = require('cloudinary').v2;
            const publicId = filePath.split('/upload/')[1]?.replace(/\.[^.]+$/, '');
            if (publicId) cloudinary.uploader.destroy(publicId);
            return true;
        } catch (e) {
            logger.error('Erreur suppression Cloudinary:', e.message);
            return false;
        }
    }
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
};

// Fonction pour obtenir l'URL publique d'un fichier
const getFileUrl = (file) => {
    // Cloudinary : le fichier multer contient déjà le path (URL complète)
    if (useCloudinary && file && file.path) return file.path;
    // Local : construire le chemin relatif
    const filePath = typeof file === 'string' ? file : (file && file.path) || '';
    return `/uploads/${filePath.split('uploads/')[1] || ''}`;
};

// File filter for messages
const messageFileFilter = (req, file, cb) => {
    // Accept images and videos for messages
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and videos are allowed for messages'));
    }
};

// Upload configuration for messages
const uploadMessageFiles = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: messageFileFilter
});

module.exports = {
    uploadAvatar,
    uploadVideo,
    uploadPortfolio,
    uploadMessageFiles,
    upload,
    deleteFile,
    getFileUrl
};
