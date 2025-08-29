const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');

// Rutas de autenticación 
router.post('/login', authController.login);
router.get('/me', authController.getCurrentUser);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

module.exports = router;