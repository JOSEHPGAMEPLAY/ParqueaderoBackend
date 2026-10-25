const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { ROLES } = require('../constants');

router.get('/', authenticate, configController.getConfig);
router.put(
  '/',
  authenticate,
  roleCheck([ROLES.ADMIN, ROLES.OWNER]),
  configController.updateConfig
);

module.exports = router;
