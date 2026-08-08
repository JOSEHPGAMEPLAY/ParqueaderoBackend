const parkingService = require('../services/parkingService');
const parkingSyncService = require('../services/parkingSyncService');
const { wrapAsync } = require('../utils/errors');

const parkingController = {
  getAllParkingRecords: wrapAsync(async (_req, res) => {
    const records = await parkingService.getAllActive();
    res.json(records);
  }),

  getAllAcitveParkingRecords: wrapAsync(async (_req, res) => {
    const records = await parkingService.getAllActive();
    res.json(records);
  }),

  getAllDailyParkingRecords: wrapAsync(async (_req, res) => {
    const records = await parkingService.getAllDailyRecords();
    res.json(records);
  }),

  getParkingRecordsById: wrapAsync(async (req, res) => {
    const { id } = req.params;
    const vehicles = await parkingService.getVehiclesByDailyRecord(id);
    res.status(200).json(vehicles);
  }),

  addDailyParking: wrapAsync(async (_req, res) => {
    const record = await parkingService.getOrCreateDailyRecord();
    res.status(201).json({ message: 'Registro creado con éxito', _id: record._id });
  }),

  addCarToParking: wrapAsync(async (req, res) => {
    const { plateNumber } = req.body;
    await parkingService.addVehicle(plateNumber);
    res.status(201).json({ message: 'Vehículo ingresado con éxito' });
  }),

  syncBatch: wrapAsync(async (req, res) => {
    const result = await parkingSyncService.syncBatch(req.body, req.user);
    res.status(200).json(result);
  }),

  calculatePrice: wrapAsync(async (req, res) => {
    const { plateNumber, isFree } = req.body;
    const price = await parkingService.calculatePrice(plateNumber, isFree);
    res.status(200).json({ message: 'Precio calculado con éxito', price });
  }),

  deleteParkingRecord: wrapAsync(async (req, res) => {
    const { id } = req.params;
    await parkingService.deleteParkingRecord(id);
    res.status(200).json({ message: 'Registro de parqueo eliminado con éxito' });
  }),

  deleteDailyParkingRecord: wrapAsync(async (req, res) => {
    const { id } = req.params;
    await parkingService.deleteDailyRecord(id);
    res.status(200).json({ message: 'Registro de parqueo eliminado con éxito' });
  }),

  calculateTotalEarned: wrapAsync(async (req, res) => {
    const { id } = req.params;
    const totalEarned = await parkingService.calculateTotalEarned(id);
    res.status(200).json({ message: 'Total ganado calculado y actualizado con éxito', totalEarned });
  }),

  updatePlateNumber: wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { plateNumber } = req.body;
    const record = await parkingService.updatePlateNumber(id, plateNumber);
    res.status(200).json({ message: 'Placa de vehículo actualizada con éxito', parkingRecord: record });
  }),
};

module.exports = parkingController;
