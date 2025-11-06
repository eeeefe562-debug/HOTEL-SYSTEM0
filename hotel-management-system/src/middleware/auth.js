const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Token no proporcionado' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const user = await query(
      'SELECT id, username, email, role, full_name, admin_id, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || user.length === 0 || !user[0].is_active) {
      return res.status(403).json({ 
        error: 'Usuario no válido o inactivo' 
      });
    }

    req.user = user[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }
    return res.status(403).json({ 
      error: 'Token inválido' 
    });
  }
};

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo administradores' 
    });
  }
  next();
};

// Middleware para verificar rol de cajero
const requireCashier = (req, res, next) => {
  if (req.user.role !== 'cashier' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo cajeros o administradores' 
    });
  }
  next();
};

// Middleware para verificar permisos específicos
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Admin tiene todos los permisos
      if (req.user.role === 'admin') {
        return next();
      }

      const permissions = await query(
        `SELECT * FROM permissions WHERE user_id = ?`,
        [req.user.id]
      );

      if (!permissions || permissions.length === 0) {
        return res.status(403).json({ 
          error: 'No tiene permisos asignados' 
        });
      }

      const userPermissions = permissions[0];
      
      if (!userPermissions[permission]) {
        return res.status(403).json({ 
          error: `No tiene permiso para: ${permission}` 
        });
      }

      req.permissions = userPermissions;
      next();
    } catch (error) {
      return res.status(500).json({ 
        error: 'Error al verificar permisos' 
      });
    }
  };
};

// Middleware para verificar que el cajero pertenece al admin correcto
const verifyCashierOwnership = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }

    // Verificar que el cajero pertenece al admin
    const cashier = await query(
      'SELECT admin_id FROM users WHERE id = ? AND role = "cashier"',
      [req.user.id]
    );

    if (!cashier || cashier.length === 0) {
      return res.status(403).json({ 
        error: 'Usuario no válido' 
      });
    }

    req.user.admin_id = cashier[0].admin_id;
    next();
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error al verificar pertenencia' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireCashier,
  checkPermission,
  verifyCashierOwnership
};