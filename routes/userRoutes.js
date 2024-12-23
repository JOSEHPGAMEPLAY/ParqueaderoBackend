const express = require('express');
const router = express.Router();
const authenticatedToken = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { changePassword, updateUser, getAllUsers, toggleUserActivation } = require('../controllers/userController');

// Ruta para cambiar la contraseña de un usuario
router.put('/change-password/:userId', authenticatedToken, changePassword);

// Ruta para actualizar los datos de un usuario
router.put('/update/:userId', authenticatedToken, updateUser);

// Ruta para obtener todos los usuarios (solo accesible por propietario)
router.get('/', authenticatedToken, roleCheck(['owner']), getAllUsers);

// Ruta para activar o desactivar un usuario (solo accesible por propietario)
router.put('/activate/:userId', authenticatedToken, roleCheck(['owner']), toggleUserActivation);

module.exports = router;
