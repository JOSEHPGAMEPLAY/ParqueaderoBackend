const mongoose = require('mongoose');

const dailyParkingRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  parkedCars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingRecord' }],
  totalEarned: { type: Number, default: 0 },
});

module.exports = mongoose.model('DailyParkingRecord', dailyParkingRecordSchema);
