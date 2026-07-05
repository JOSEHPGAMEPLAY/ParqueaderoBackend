const { AppError } = require("../utils/errors");

const roleCheck = (roles) => (req, res, next) => {
  if (!req.user) {
    throw AppError.unauthorized('Acceso denegado. No autenticado');
  }
  if (!roles.includes(req.user.role)) {
    throw AppError.forbidden('No tienes permisos para realizar esta acción');
  }
  next();
};

module.exports = roleCheck;
