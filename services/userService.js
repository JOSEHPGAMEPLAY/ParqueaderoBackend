const User = require('../models/User');
const bcrypt = require('bcrypt');
const { AppError } = require('../utils/errors');
const { ROLES } = require('../constants');

const SALT_ROUNDS = 10;

const userService = {
  async findById(userId) {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound('Usuario no encontrado');
    return user;
  },

  async findByUsername(username) {
    return User.findOne({ username });
  },

  async getAll() {
    return User.find();
  },

  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.findById(userId);
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) throw AppError.badRequest('Contraseña actual incorrecta');

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
  },

  async resetPassword(targetUser, requesterRole, requesterId) {
    if (requesterRole === ROLES.ADMIN && targetUser.role !== ROLES.USER) {
      throw AppError.forbidden('No tienes permiso para cambiar la contraseña de este usuario');
    }
    if (
      requesterRole === ROLES.OWNER &&
      targetUser.role === ROLES.OWNER &&
      requesterId !== targetUser._id.toString()
    ) {
      throw AppError.forbidden('No puedes cambiar la contraseña de otro owner');
    }
  },

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  },

  async update(userId, data) {
    const user = await this.findById(userId);
    if (data.username) user.username = data.username;
    if (data.role) user.role = data.role;
    await user.save();
    return user;
  },

  async toggleActivation(targetUser, requesterRole) {
    if (
      requesterRole === ROLES.ADMIN &&
      (targetUser.role === ROLES.OWNER || targetUser.role === ROLES.ADMIN)
    ) {
      throw AppError.forbidden('No tienes permiso para cambiar el estado de este usuario');
    }
    return User.toggleUserStatus(targetUser._id, !targetUser.isActive);
  },

  async register(username, password) {
    const existing = await this.findByUsername(username);
    if (existing) throw AppError.conflict('El usuario ya existe');
    const user = new User({ username, password });
    await user.save();
    return user;
  },
};

module.exports = userService;
