const express= require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authenticateToken = require('../middleware/auth');

// Obtener los datos de los registros diarios
router.get('/', authenticateToken, parkingController.getAllDailyParkingRecords);

// Eliminar un registro diario
router.delete('/', authenticateToken, parkingController.deleteDailyParkingRecord);

// Ruta para calcular y actualizar el total ganado para un registro diario de parqueo
router.put("/calculateTotalEarned/:dailyParkingRecordId", authenticateToken, parkingController.calculateTotalEarned);


module.exports = router;
