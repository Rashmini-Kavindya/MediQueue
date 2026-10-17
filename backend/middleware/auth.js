const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({success: false, message: 'Access denied. No token provided.'});
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey123');
  } catch (_) {
    return res.status(401).json({success: false, message: 'Invalid or expired token.'});
  }

  try {
    // Critical: a deactivated user must not be able to keep using a previously issued JWT.
    const account = await User.findOne({userId: decoded.userId})
      .select('userId role status');
    if (!account || account.status !== 'active') {
      return res.status(401).json({success: false, message: 'Your account is not active.'});
    }

    // Current role comes from MongoDB, not a potentially stale JWT payload.
    req.user = {...decoded, userId: account.userId, role: account.role};
    next();
  } catch (error) {
    console.error('Auth account status check failed:', error);
    return res.status(503).json({success: false, message: 'Unable to verify account status.'});
  }
};

exports.roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({success: false, message: 'Permission denied for this role.'});
    }
    next();
  };
};
