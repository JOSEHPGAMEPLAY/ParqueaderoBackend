const express= require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authenticateToken = require('../middleware/auth');

// Obtener los datos de los registros diarios
router.get('/', authenticateToken, parkingController.getAllDailyParkingRecords);

// Eliminar un registro diario
router.delete('/:id', authenticateToken, parkingController.deleteDailyParkingRecord);

// Ruta para calcular y actualizar el total ganado para un registro diario de parqueo
router.put("/calculateTotalEarned/:id", authenticateToken, parkingController.calculateTotalEarned);

// Obtener todos los registros de parqueo de un regitro especifico
router.get('/:id', authenticateToken, parkingController.getParkingRecordsById);


module.exports = router;
