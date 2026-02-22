const express = require('express');
const auth = require('../lib/auth');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, userType, profileData } = req.body;

    // Validation des champs requis
    if (!email || !password || !firstName || !lastName || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis'
      });
    }

    // Validation du type d'utilisateur
    if (!['TALENT', 'AGENCY'].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: 'Type d\'utilisateur invalide'
      });
    }

    // Validation du mot de passe
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email invalide'
      });
    }

    const result = await auth.register({
      email,
      password,
      firstName,
      lastName,
      userType,
      profileData
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    const result = await auth.login(email, password);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Route pour vérifier le token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const result = await auth.getProfileFromToken(req.headers.authorization.split(' ')[1]);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Route pour obtenir le profil complet
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await auth.getProfileFromToken(req.headers.authorization.split(' ')[1]);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Route pour mettre à jour le profil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const profileData = req.body;
    
    const result = await auth.updateProfile(req.user.id, profileData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

module.exports = router;
