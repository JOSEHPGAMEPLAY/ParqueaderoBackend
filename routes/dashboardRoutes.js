const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/role');
const { ROLES } = require('../constants');

router.get(
  '/metrics',
  authenticate,
  roleCheck([ROLES.ADMIN, ROLES.OWNER]),
  dashboardController.getMetrics
);

module.exports = router;
