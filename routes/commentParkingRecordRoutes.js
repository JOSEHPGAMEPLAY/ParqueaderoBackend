const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentParkingRecordController');
const authenticate = require('../middleware/auth');

router.post('/', authenticate, commentController.addComment);
router.get('/:id', authenticate, commentController.getCommentsByParkingRecord);
router.delete('/:id', authenticate, commentController.deleteCommentById);
router.put('/:id', authenticate, commentController.updateCommentById);

module.exports = router;
