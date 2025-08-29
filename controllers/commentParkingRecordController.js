const TimeUtils = require('../utils/time');
const CommentParkingRecord = require('../models/CommentParkingRecord');

exports.addComment = async (req, res) => {
  const { parkingRecordId, message } = req.body;
  const userId = req.user.userId;

  try {
    const comment = new CommentParkingRecord({
      parkingRecordId,
      author: userId,
      message
    });

    await comment.save();
    res.status(201).json({ message: 'Comentario agregado'});
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar el comentario', error: error.message });
  }
};

exports.getCommentsByParkingRecord = async (req, res) => {
  const { id } = req.params;

  try {
    const comments = await CommentParkingRecord
      .find({ parkingRecordId: id })
      .populate('author', 'username')
      .sort({ timestamp: -1 });

    const formattedComments = comments.map(comment => ({
      _id: comment._id,
      message: comment.message,
      author: comment.author,
      createdAt: TimeUtils.toBogota(comment.createdAt),
      updatedAt: TimeUtils.toBogota(comment.updatedAt),
    }));

    res.json(formattedComments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener comentarios', error: error.message });
  }
};

exports.deleteCommentById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;
    
    try {
        const comment = await CommentParkingRecord.findById(id);
    
        if (!comment) {
        return res.status(404).json({ message: 'Comentario no encontrado' });
        }
    
        const isAuthor = comment.author.toString() === userId;
        const isAdminOrOwner = role === 'admin' || role === 'owner';

        if (!isAuthor && !isAdminOrOwner) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });
        }
    
        await comment.deleteOne();
        res.json({ message: 'Comentario eliminado con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el comentario', error: error.message });
    }
};

exports.updateCommentById = async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;
    const role = req.user.role;

    try {
        const comment = await CommentParkingRecord.findById(id);

        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        const isAuthor = comment.author.toString() === userId;
        const isAdminOrOwner = role === 'admin' || role === 'owner';

        if (!isAuthor && !isAdminOrOwner) {
            return res.status(403).json({ message: 'No tienes permiso para actualizar este comentario' });
        }

        comment.message = message;
        await comment.save();
        res.json({ message: 'Comentario actualizado con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el comentario', error: error.message });
    }
}