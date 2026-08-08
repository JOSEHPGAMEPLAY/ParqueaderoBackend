const jwt = require('jsonwebtoken');
const ms = require('ms');

const TOKEN_COOKIE_NAME = 'token';

const authService = {
  generateToken(user) {
    return jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );
  },

  generateMobileToken(user) {
    return jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );
  },

  setTokenCookie(res, token) {
    const maxAge = ms(process.env.JWT_EXPIRATION);
    res.cookie(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge,
    });
  },

  clearTokenCookie(res) {
    res.clearCookie(TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  },

  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  },
};

module.exports = authService;
