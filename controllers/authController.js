const jwt = require('jsonwebtoken');
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

    // Validar contraseña maestra
    const MASTER_ADMIN_KEY = process.env.MASTER_ADMIN_KEY;
    if (password !== MASTER_ADMIN_KEY) {
      throw AppError.unauthorized('Clave única maestra inválida.');
    }

    // Buscar o registrar operador
    let operator = await userService.findByUsername(username);
    if (!operator) {
      operator = await userService.register(username, password);
      await operator.updateOne({
        role: 'operator',
        isActive: true,
        deviceMetadata: { brand: deviceBrand, model: deviceModel, os: deviceOsVersion },
      });
      operator = await userService.findByUsername(username);
    } else {
      // Actualizar dispositivo actual del operador
      await operator.updateOne({
        deviceMetadata: { brand: deviceBrand, model: deviceModel, os: deviceOsVersion },
      });
      operator = await userService.findByUsername(username);
    }

    // Generar JWT con expiración larga (365 días)
    const token = jwt.sign(
      { userId: operator._id, username: operator.username, role: operator.role },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    res.status(200).json({
      token,
      username: operator.username,
      role: operator.role,
      isActive: operator.isActive,
      message: 'Cuenta registrada y dispositivo móvil vinculado de forma exitosa.',
    });
  }),
};

module.exports = authController;
