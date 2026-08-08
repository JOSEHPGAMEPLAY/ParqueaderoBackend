const userService = require('../services/userService');
const authService = require('../services/authService');
const { wrapAsync } = require('../utils/errors');

const userController = {
  getAllUsers: wrapAsync(async (_req, res) => {
    const users = await userService.getAll();
    res.status(200).json({ users });
  }),

  changePassword: wrapAsync(async (req, res) => {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;
    const requesterId = req.user.userId;
    await userService.changePassword(userId, oldPassword, newPassword, requesterId);
    res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  }),

  resetPassword: wrapAsync(async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const requesterRole = req.user.role;
    const requesterId = req.user.userId;

    const targetUser = await userService.findById(userId);
    await userService.resetPassword(targetUser, requesterRole, requesterId);

    const hashed = await userService.hashPassword(newPassword);
    targetUser.password = hashed;
    await targetUser.save();

    res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  }),

  updateUser: wrapAsync(async (req, res) => {
    const { userId } = req.params;
    const { username, role } = req.body;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const user = await userService.update(userId, { username, role }, requesterId, requesterRole);
    if (requesterId === userId) {
      const token = authService.generateToken(user);
      authService.setTokenCookie(res, token);
    }
    res.status(200).json({ message: 'Usuario actualizado exitosamente', user });
  }),

  deleteUser: wrapAsync(async (req, res) => {
    const { userId } = req.params;
    const requesterRole = req.user.role;
    const requesterId = req.user.userId;
    await userService.deleteUser(userId, requesterRole, requesterId);
    res.status(200).json({ message: 'Usuario eliminado exitosamente' });
  }),

  toggleUserActivation: wrapAsync(async (req, res) => {
    const { userId } = req.params;
    const requesterRole = req.user.role;

    const targetUser = await userService.findById(userId);
    const updatedUser = await userService.toggleActivation(targetUser, requesterRole);

    res.status(200).json({
      message: `Usuario ${updatedUser.isActive ? 'activado' : 'desactivado'} correctamente`,
      user: updatedUser,
    });
  }),
};

module.exports = userController;
