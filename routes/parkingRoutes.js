const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/role');

router.get('/', authenticate, parkingController.getAllParkingRecords);
router.get('/active', authenticate, parkingController.getAllAcitveParkingRecords);
router.post('/', authenticate, parkingController.addCarToParking);
router.put('/calculateprice', authenticate, parkingController.calculatePrice);
router.put('/:id', authenticate, parkingController.updatePlateNumber);
router.delete('/:id', authenticate, roleCheck(['admin', 'owner']), parkingController.deleteParkingRecord);

module.exports = router;
