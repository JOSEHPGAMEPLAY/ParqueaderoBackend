const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authenticate = require('../middleware/auth');
const { ROLES } = require('../constants');
const roleCheck = require('../middleware/role');

router.get('/', authenticate, parkingController.getAllDailyParkingRecords);
router.get('/:id', authenticate, parkingController.getParkingRecordsById);
router.post('/', authenticate, parkingController.addDailyParking);
router.delete('/:id', authenticate, roleCheck([ROLES.ADMIN, ROLES.OWNER]), parkingController.deleteDailyParkingRecord);
router.put('/calculatetotalearned/:id', authenticate, parkingController.calculateTotalEarned);

module.exports = router;
