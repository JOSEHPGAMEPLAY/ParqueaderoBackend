const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.get('/me', authController.getCurrentUser);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.post('/register-mobile', authController.registerMobile);

module.exports = router;
