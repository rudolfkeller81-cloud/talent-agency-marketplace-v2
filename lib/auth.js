const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('./supabase');

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || 'talent-agency-super-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

class AuthService {
  // Générer un token JWT
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        userType: user.userType 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Vérifier un token JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Hasher un mot de passe
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Vérifier un mot de passe
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Inscription d'un nouvel utilisateur
  async register(userData) {
    try {
      const { email, password, firstName, lastName, userType, profileData } = userData;

      // Vérifier si l'email existe déjà
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('Cet email est déjà utilisé');
      }

      // Hasher le mot de passe
      const hashedPassword = await this.hashPassword(password);

      // Créer l'utilisateur
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          userType
        })
        .select()
        .single();

      if (userError) throw userError;

      // Créer le profil si fourni
      if (profileData && newUser.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            userId: newUser.id,
            created_at: new Date().toISOString(),
            ...profileData
          });

        if (profileError) {
          console.log('⚠️ Erreur création profil:', profileError.message);
        }
      }

      // Générer le token
      const token = this.generateToken(newUser);

      // Retourner les infos utilisateur (sans le mot de passe)
      const { password: _, ...userWithoutPassword } = newUser;

      return {
        success: true,
        user: userWithoutPassword,
        token
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Connexion d'un utilisateur
  async login(email, password) {
    try {
      // Rechercher l'utilisateur
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !user) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Vérifier le mot de passe
      const isValidPassword = await this.verifyPassword(password, user.password);

      if (!isValidPassword) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Générer le token
      const token = this.generateToken(user);

      // Récupérer le profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('userId', user.id)
        .single();

      // Retourner les infos (sans le mot de passe)
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        user: {
          ...userWithoutPassword,
          profile
        },
        token
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtenir le profil utilisateur à partir du token
  async getProfileFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      if (!decoded) {
        throw new Error('Token invalide');
      }

      // Récupérer l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (userError || !user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Récupérer le profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('userId', user.id)
        .single();

      // Retourner les infos (sans le mot de passe)
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        user: {
          ...userWithoutPassword,
          profile
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mettre à jour le profil
  async updateProfile(userId, profileData) {
    try {
      // D'abord vérifier si le profil existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('userId', userId)
        .single();

      let result;
      
      if (existingProfile) {
        // Mettre à jour le profil existant
        const { data: profile, error } = await supabase
          .from('profiles')
          .update({
            ...profileData,
            updatedAt: new Date().toISOString()
          })
          .eq('userId', userId)
          .select()
          .single();

        if (error) throw error;
        result = profile;
      } else {
        // Créer un nouveau profil
        const { data: profile, error } = await supabase
          .from('profiles')
          .insert({
            userId,
            ...profileData,
            created_at: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        result = profile;
      }

      return {
        success: true,
        profile: result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AuthService();
