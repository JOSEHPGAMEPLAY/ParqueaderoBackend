const express = require('express');
const router = express.Router();
const commentParkingRecordController = require('../controllers/commentParkingRecordController');
const authenticateToken = require('../middleware/auth');

// Agregar comentario a un parking record
router.post('/', authenticateToken, commentParkingRecordController.addComment);

// Obtener todos los comentarios de un parking record
router.get('/:id', authenticateToken, commentParkingRecordController.getCommentsByParkingRecord);

module.exports = router;
