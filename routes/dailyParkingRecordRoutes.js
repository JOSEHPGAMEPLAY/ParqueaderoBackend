const express= require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authenticateToken = require('../middleware/auth');

// Obtener los datos de los registros diarios
router.get('/', authenticateToken, parkingController.getAllDailyParkingRecords);

// Obtener todos los registros de parqueo de un regitro especifico
router.get('/:id', authenticateToken, parkingController.getParkingRecordsById);

// Crear un registro
router.post('/', authenticateToken, parkingController.addDailyParking);

// Eliminar un registro diario
router.delete('/:id', authenticateToken, parkingController.deleteDailyParkingRecord);

// Ruta para calcular y actualizar el total ganado para un registro diario de parqueo
router.put("/calculateTotalEarned/:id", authenticateToken, parkingController.calculateTotalEarned);


module.exports = router;
