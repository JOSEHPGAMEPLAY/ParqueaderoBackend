const authService = require('../services/authService');
const userService = require('../services/userService');
const { wrapAsync } = require('../utils/errors');

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
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Usuario deshabilitado. Contacte al administrador.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
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
      return res.status(401).json({ message: 'No autorizado, no hay token' });
    }
    const decoded = authService.verifyToken(token);
    res.status(200).json({ valid: true, user: decoded });
  }),
};

module.exports = authController;
