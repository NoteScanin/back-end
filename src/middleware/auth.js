const jwt = require('jsonwebtoken');
const { stmts } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'scanin-super-secret-jwt-key-change-me-in-production';

/**
 * Generate JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Express middleware – verifies JWT and attaches req.user.
 */
function requireAuth(req, res, next) {
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      error_details: { message: 'Token tidak ditemukan. Silakan login.' },
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = stmts.findUserById.get(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        error_details: { message: 'User tidak ditemukan.' },
      });
    }
    // Don't expose password hash
    const { password_hash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      error_details: { message: 'Token tidak valid atau sudah expired.' },
    });
  }
}

/**
 * Optional auth — if token is present, attach user; otherwise continue.
 */
function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = stmts.findUserById.get(decoded.id);
    if (user) {
      const { password_hash, ...safeUser } = user;
      req.user = safeUser;
    }
  } catch {
    // ignore invalid token
  }
  next();
}

module.exports = { generateToken, requireAuth, optionalAuth, JWT_SECRET };
