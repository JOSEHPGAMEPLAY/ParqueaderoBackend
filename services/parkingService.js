const ParkingRecord = require('../models/ParkingRecord');
const DailyParkingRecord = require('../models/DailyParkingRecord');
const TimeUtils = require('../utils/time');
const { AppError } = require('../utils/errors');

const parkingService = {
  async getAllActive() {
    return ParkingRecord.find({ exitTime: null }).sort({ entryTime: -1 });
  },

  async getAllDailyRecords() {
    return DailyParkingRecord.find().sort({ date: -1 });
  },

  async getVehiclesByDailyRecord(dailyRecordId) {
    const record = await DailyParkingRecord.findById(dailyRecordId).populate('parkedCars');
    if (!record) throw AppError.notFound('Registro diario no encontrado');
    return record.parkedCars;
  },

  async getOrCreateDailyRecord() {
    const today = TimeUtils.todayMidnight();
    let record = await DailyParkingRecord.findOne({ date: today });
    if (!record) {
      record = new DailyParkingRecord({ date: today });
      await record.save();
    }
    return record;
  },

  async addVehicle(plateNumber) {
    const existing = await ParkingRecord.findOne({ plateNumber, exitTime: null });
    if (existing) throw AppError.conflict('El vehículo ya ingresó');

    const dailyRecord = await this.getOrCreateDailyRecord();
    const parkingRecord = new ParkingRecord({
      plateNumber,
      entryTime: TimeUtils.now(),
      dailyParkingRecord: dailyRecord._id,
    });

    dailyRecord.parkedCars.push(parkingRecord);
    await parkingRecord.save();
    await dailyRecord.save();
  },

  async calculatePrice(plateNumber, isFree = false) {
    const parkingRecord = await ParkingRecord.findOne({ plateNumber, exitTime: null });
    if (!parkingRecord) throw AppError.notFound('El vehículo no se ha encontrado');

    parkingRecord.exitTime = TimeUtils.now();
    parkingRecord.isFree = isFree;
    await parkingRecord.save();

    return parkingRecord.price;
  },

  async deleteParkingRecord(recordId) {
    const record = await ParkingRecord.findById(recordId);
    if (!record) throw AppError.notFound('Registro de parqueo no encontrado');

    await DailyParkingRecord.findByIdAndUpdate(record.dailyParkingRecord, {
      $pull: { parkedCars: recordId },
    });
    await ParkingRecord.findByIdAndDelete(recordId);
  },

  async deleteDailyRecord(recordId) {
    const record = await DailyParkingRecord.findById(recordId).populate('parkedCars');
    if (!record) throw AppError.notFound('Registro diario no encontrado');

    const deletePromises = record.parkedCars.map((car) =>
      ParkingRecord.findByIdAndDelete(car._id)
    );
    await Promise.all(deletePromises);
    await DailyParkingRecord.findByIdAndDelete(recordId);
  },

  async calculateTotalEarned(dailyRecordId) {
    const record = await DailyParkingRecord.findById(dailyRecordId).populate('parkedCars');
    if (!record) throw AppError.notFound('Registro diario no encontrado');

    const totalEarned = record.parkedCars.reduce((sum, car) => sum + car.price, 0);
    record.totalEarned = totalEarned;
    await record.save();

    return totalEarned;
  },

  async updatePlateNumber(recordId, plateNumber) {
    const record = await ParkingRecord.findOne({ _id: recordId, exitTime: null });
    if (!record) throw AppError.notFound('Registro no encontrado');

    record.plateNumber = plateNumber;
    await record.save();
    return record;
  },
};

module.exports = parkingService;
