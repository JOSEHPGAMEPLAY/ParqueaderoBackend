const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { ROLES } = require('../constants');
const roleCheck = require('../middleware/role');
const userController = require('../controllers/userController');

router.put('/change-password/:userId', authenticate, userController.changePassword);
router.put('/reset-password/:userId', authenticate, roleCheck([ROLES.ADMIN, ROLES.OWNER]), userController.resetPassword);
router.put('/update/:userId', authenticate, userController.updateUser);
router.get('/', authenticate, roleCheck([ROLES.ADMIN, ROLES.OWNER]), userController.getAllUsers);
router.put('/activate/:userId', authenticate, roleCheck([ROLES.ADMIN, ROLES.OWNER]), userController.toggleUserActivation);
router.delete('/:userId', authenticate, roleCheck([ROLES.ADMIN, ROLES.OWNER]), userController.deleteUser);

module.exports = router;
