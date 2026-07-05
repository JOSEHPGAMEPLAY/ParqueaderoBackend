const commentService = require('../services/commentService');
const { wrapAsync } = require('../utils/errors');

const commentController = {
  addComment: wrapAsync(async (req, res) => {
    const { parkingRecordId, message } = req.body;
    const userId = req.user.userId;
    await commentService.add(parkingRecordId, userId, message);
    res.status(201).json({ message: 'Comentario agregado' });
  }),

  getCommentsByParkingRecord: wrapAsync(async (req, res) => {
    const { id } = req.params;
    const comments = await commentService.getByParkingRecord(id);
    res.json(comments);
  }),

  deleteCommentById: wrapAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;
    await commentService.delete(id, userId, role);
    res.json({ message: 'Comentario eliminado con éxito' });
  }),

  updateCommentById: wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;
    const role = req.user.role;
    await commentService.update(id, message, userId, role);
    res.json({ message: 'Comentario actualizado con éxito' });
  }),
};

module.exports = commentController;
