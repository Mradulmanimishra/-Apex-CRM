const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required. Please log in.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server configuration error: JWT_SECRET not set.' });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Session expired or token invalid. Please log in again.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    
    const hasRole = Array.isArray(allowedRoles) 
      ? allowedRoles.includes(req.user.role) 
      : req.user.role === allowedRoles;

    if (!hasRole) {
      return res.status(403).json({ success: false, error: `Forbidden. Requires role: ${allowedRoles}` });
    }
    
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
