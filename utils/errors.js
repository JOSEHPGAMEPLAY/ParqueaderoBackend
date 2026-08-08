class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404);
  }

  static badRequest(message = 'Solicitud inválida') {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'No autorizado') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'No tienes permisos para realizar esta acción') {
    return new AppError(message, 403);
  }

  static conflict(message = 'El recurso ya existe') {
    return new AppError(message, 409);
  }
}

const errorHandler = (err, req, res, _next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('Error inesperado:', err);
  return res.status(500).json({ message: 'Error interno del servidor' });
};

const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, wrapAsync };
