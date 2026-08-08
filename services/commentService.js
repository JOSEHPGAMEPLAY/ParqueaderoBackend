const CommentParkingRecord = require('../models/CommentParkingRecord');
const TimeUtils = require('../utils/time');
const { AppError } = require('../utils/errors');
const { ROLES } = require('../constants');

const commentService = {
  async add(parkingRecordId, authorId, message) {
    const comment = new CommentParkingRecord({ parkingRecordId, author: authorId, message });
    await comment.save();
  },

  async getByParkingRecord(parkingRecordId) {
    const comments = await CommentParkingRecord.find({
      parkingRecordId,
    })
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    return comments.map((c) => ({
      _id: c._id,
      message: c.message,
      author: c.author,
      createdAt: TimeUtils.toBogota(c.createdAt),
      updatedAt: TimeUtils.toBogota(c.updatedAt),
    }));
  },

  async findById(commentId) {
    const comment = await CommentParkingRecord.findById(commentId);
    if (!comment) throw AppError.notFound('Comentario no encontrado');
    return comment;
  },

  _hasPermission(comment, userId, role) {
    const isAuthor = comment.author.toString() === userId;
    const isAdminOrOwner = role === ROLES.ADMIN || role === ROLES.OWNER;
    return isAuthor || isAdminOrOwner;
  },

  async delete(commentId, userId, role) {
    const comment = await this.findById(commentId);
    if (!this._hasPermission(comment, userId, role)) {
      throw AppError.forbidden('No tienes permiso para eliminar este comentario');
    }
    await comment.deleteOne();
  },

  async update(commentId, message, userId, role) {
    const comment = await this.findById(commentId);
    if (!this._hasPermission(comment, userId, role)) {
      throw AppError.forbidden('No tienes permiso para actualizar este comentario');
    }
    comment.message = message;
    await comment.save();
  },
};

module.exports = commentService;
