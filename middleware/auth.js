const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

const authenticateToken = (req, res, next) => {
  const token = req.cookies?.token || extractBearerToken(req);

  if (!token) {
    throw AppError.unauthorized('Token no proporcionado');
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    throw AppError.unauthorized('Token inválido o expirado');
  }
};

function extractBearerToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

module.exports = authenticateToken;
