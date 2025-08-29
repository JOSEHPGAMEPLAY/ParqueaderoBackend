const mongoose = require('mongoose');

const commentParkingRecordSchema = new mongoose.Schema({
  parkingRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingRecord',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    minlength: 3,
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CommentParkingRecord', commentParkingRecordSchema);