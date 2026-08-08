const authService = require('../services/authService');
const userService = require('../services/userService');
const { wrapAsync, AppError } = require('../utils/errors');

const authController = {
  register: wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    await userService.register(username, password);
    res.status(201).json({ message: 'Usuario registrado con éxito' });
  }),

  login: wrapAsync(async (req, res) => {
    const { username, password } = req.body;

    const user = await userService.findByUsername(username);
    if (!user) {
      throw AppError.badRequest('Usuario o contraseña incorrectos');
    }
    if (!user.isActive) {
      throw AppError.forbidden('Usuario deshabilitado. Contacte al administrador.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw AppError.badRequest('Usuario o contraseña incorrectos');
    }

    const token = authService.generateToken(user);
    authService.setTokenCookie(res, token);
    res.status(200).json({ message: 'Login exitoso' });
  }),

  logout: wrapAsync(async (_req, res) => {
    authService.clearTokenCookie(res);
    res.status(200).json({ message: 'Sesión cerrada' });
  }),

  getCurrentUser: wrapAsync(async (req, res) => {
    const token = req.cookies?.token;
    if (!token) {
      throw AppError.unauthorized('No autorizado, no hay token');
    }
    const decoded = authService.verifyToken(token);
    res.status(200).json({ valid: true, user: decoded });
  }),

  registerMobile: wrapAsync(async (req, res) => {
    const { username, password, deviceBrand, deviceModel, deviceOsVersion } = req.body;
    if (!username || !password) {
      throw AppError.badRequest('Usuario y contraseña son obligatorios');
    }

    const operator = await userService.registerMobile({
      username,
      password,
      deviceBrand,
      deviceModel,
      deviceOsVersion,
    });
    const token = authService.generateMobileToken(operator);

    res.status(200).json({
      token,
      username: operator.username,
      role: operator.role,
      isActive: operator.isActive,
      message: 'Operador autenticado exitosamente.',
    });
  }),
};

module.exports = authController;
