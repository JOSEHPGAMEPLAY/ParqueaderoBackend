const mongoose = require('mongoose');
const configService = require('../services/configService');
const { calculatePrice } = require('../utils/pricing');

const parkingRecordSchema = new mongoose.Schema(
  {
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
    hasTicket: { type: Boolean, default: true },
    dailyParkingRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyParkingRecord',
    },
    localId: {
      type: String,
      unique: true,
      sparse: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    operatorName: { type: String, trim: true, default: null },
    deviceModel: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

parkingRecordSchema.methods.calculatePrice = function (config) {
  return calculatePrice({
    entryTime: this.entryTime,
    exitTime: this.exitTime,
    isFree: this.isFree,
    hasTicket: this.hasTicket,
    config,
  });
};

parkingRecordSchema.pre('save', async function (next) {
  try {
    // Los registros ya cerrados conservan el valor histórico cobrado.
    if (this.$locals?.skipPriceRecalc) return next();

    const config = await configService.getConfig();
    this.price = this.calculatePrice(config);
    next();
  } catch (error) {
    next(error);
  }
});

parkingRecordSchema.index({ plateNumber: 1, exitTime: 1 });

module.exports = mongoose.model('ParkingRecord', parkingRecordSchema);
