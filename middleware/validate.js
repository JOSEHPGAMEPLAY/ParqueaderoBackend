const { AppError } = require('../utils/errors');

const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema(req.body);
  if (error) {
    return next(AppError.badRequest(error));
  }
  req.validatedBody = value;
  next();
};

const requiredFields = (...fields) => (req, _res, next) => {
  const missing = fields.filter((field) => {
    const value = req.body[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return next(
      AppError.badRequest(`Campos requeridos: ${missing.join(', ')}`)
    );
  }
  next();
};

module.exports = { validate, requiredFields };
