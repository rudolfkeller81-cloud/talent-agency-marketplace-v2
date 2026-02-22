const auth = require('../lib/auth');

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token requis'
    });
  }

  const decoded = auth.verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: 'Token invalide ou expiré'
    });
  }

  req.user = decoded;
  next();
}

// Middleware pour vérifier le type d'utilisateur
function requireUserType(allowedTypes) {
  return (req, res, next) => {
    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé pour ce type d\'utilisateur'
      });
    }
    next();
  };
}

// Middleware pour vérifier que l'utilisateur accède à ses propres données
function requireOwnership(req, res, next) {
  const requestedUserId = req.params.userId || req.params.id;
  
  if (req.user.id !== requestedUserId) {
    return res.status(403).json({
      success: false,
      error: 'Accès non autorisé'
    });
  }
  
  next();
}

module.exports = {
  authenticateToken,
  requireUserType,
  requireOwnership
};
