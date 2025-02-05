const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authenticateToken = require('../middleware/auth');
const roleCheck = require('../middleware/role');

// Obtener todos los registros de parqueo
router.get('/', authenticateToken, parkingController.getAllParkingRecords);

// Agregar un carro al parqueadero
router.post('/',authenticateToken, parkingController.addCarToParking);

// Calcular el precio al salir del parqueadero
router.put('/calculatePrice', authenticateToken, parkingController.calculatePrice,);

// Actualizar la placa de un carro 
router.put('/:id', authenticateToken, parkingController.updatePlateNumber);

// Eliminar un registro de parqueo
router.delete('/:id',authenticateToken, roleCheck(['admin', 'owner']), parkingController.deleteParkingRecord);

module.exports = router;