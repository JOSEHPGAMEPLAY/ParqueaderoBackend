const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const userController = require('../controllers/userController');

router.put('/change-password/:userId', authenticate, userController.changePassword);
router.put('/reset-password/:userId', authenticate, roleCheck(['admin', 'owner']), userController.resetPassword);
router.put('/update/:userId', authenticate, userController.updateUser);
router.get('/', authenticate, roleCheck(['admin', 'owner']), userController.getAllUsers);
router.put('/activate/:userId', authenticate, roleCheck(['admin', 'owner']), userController.toggleUserActivation);

module.exports = router;
