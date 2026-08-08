const mongoose = require('mongoose');

const parkingRecordSchema = new mongoose.Schema({
  plateNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  entryTime: { type: Date, required: true },
  exitTime: { type: Date, default: null },
  price: { type: Number, default: 0 },
  isFree: { type: Boolean, default: false },
  dailyParkingRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyParkingRecord',
  },
  localId: {
    type: String,
    unique: true,
    sparse: true,
  },
});

parkingRecordSchema.methods.calculatePrice = function () {
  if (this.isFree || !this.exitTime) return 0;

  const MS_PER_HOUR = 1000 * 60 * 60;
  const MS_PER_QUARTER = MS_PER_HOUR / 10;

  const diffMs = this.exitTime - this.entryTime;
  const fullHours = Math.floor(diffMs / MS_PER_HOUR);
  const remainingMs = diffMs % MS_PER_HOUR;
  const extraHour = remainingMs > MS_PER_QUARTER ? 1 : 0;

  const totalHours = fullHours + extraHour;
  const hourlyRate = Number(process.env.PRICE) || 1000;

  return totalHours === 0 ? hourlyRate : totalHours * hourlyRate;
};

parkingRecordSchema.pre('save', function (next) {
  this.price = this.calculatePrice();
  next();
});

module.exports = mongoose.model('ParkingRecord', parkingRecordSchema);
