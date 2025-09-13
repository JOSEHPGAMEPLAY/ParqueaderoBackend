const express = require('express');
const router = express.Router();
const commentParkingRecordController = require('../controllers/commentParkingRecordController');
const authenticateToken = require('../middleware/auth');

// Agregar comentario a un parking record
router.post('/', authenticateToken, commentParkingRecordController.addComment);

// Obtener todos los comentarios de un parking record
router.get('/:id', authenticateToken, commentParkingRecordController.getCommentsByParkingRecord);

// Eliminar un comentario por ID
router.delete('/:id', authenticateToken, commentParkingRecordController.deleteCommentById);

// Actualizar un comentario por ID 
router.put('/:id', authenticateToken, commentParkingRecordController.updateCommentById);

module.exports = router;
