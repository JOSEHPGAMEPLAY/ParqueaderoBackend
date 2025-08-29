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
    res.status(201).json({ message: 'Comentario agregado', comment });
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

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener comentarios', error: error.message });
  }
};