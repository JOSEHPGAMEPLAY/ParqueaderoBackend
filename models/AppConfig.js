const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema(
  {
    hour: { type: Number, default: 0, min: 0 },
    fraction: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const billingSchema = new mongoose.Schema(
  {
    minimumHours: { type: Number, default: 1, min: 0, max: 24 },
    fractionThresholdMinutes: { type: Number, default: 15, min: 0, max: 59 },
    freeMinutes: { type: Number, default: 0, min: 0, max: 1440 },
  },
  { _id: false }
);

const mobileSchema = new mongoose.Schema(
  {
    collaborativeSyncEnabled: { type: Boolean, default: true },
    syncIntervalSeconds: { type: Number, default: 30, min: 10, max: 600 },
  },
  { _id: false }
);

const appConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'global', index: true },
    version: { type: Number, default: 1, min: 1 },
    currency: { type: String, default: 'COP', uppercase: true, trim: true },
    locale: { type: String, default: 'es-CO', trim: true },
    timezone: { type: String, default: 'America/Bogota', trim: true },
    billing: { type: billingSchema, default: () => ({}) },
    rates: {
      withTicket: { type: rateSchema, default: () => ({}) },
      withoutTicket: { type: rateSchema, default: () => ({}) },
    },
    mobile: { type: mobileSchema, default: () => ({}) },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppConfig', appConfigSchema);
