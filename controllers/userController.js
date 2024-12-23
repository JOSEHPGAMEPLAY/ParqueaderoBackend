const User = require('../models/User');
const bcrypt = require('bcrypt');

// Controlador para cambiar la contraseña de un usuario
const changePassword = async (req, res) => {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Comparar la contraseña actual
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta' });
        }

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;

        // Guardar el usuario con la nueva contraseña
        await user.save();
        res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar la contraseña' });
    }
};

// Controlador para actualizar los datos del usuario
const updateUser = async (req, res) => {
    const { userId } = req.params;
    const { username, role } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Actualizar los datos del usuario
        if (username) user.username = username;
        if (role) user.role = role;

        // Guardar los cambios
        await user.save();
        res.status(200).json({ message: 'Usuario actualizado exitosamente', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
};

// Controlador para obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
};

// Controlador para activar o desactivar un usuario
const toggleUserActivation = async (req, res) => {
    const { userId } = req.params;
    const { isActive } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Cambiar el estado de activación
        const updatedUser = await User.toggleUserStatus(userId, isActive);
        res.status(200).json({ message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`, user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el estado del usuario' });
    }
};

module.exports = {
    changePassword,
    updateUser,
    getAllUsers,
    toggleUserActivation
};
