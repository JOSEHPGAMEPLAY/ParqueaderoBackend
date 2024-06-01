const mongoose = require("mongoose");

const dailyParkingRecordSchema = new mongoose.Schema({
    date: { type: Date, requierd: true },
    parkedCars: [
        { type: mongoose.Schema.Types.ObjectId, ref: "ParkingRecord" },
    ],
    totalEarned: { type: Number, default: 0, required: true },
});

const DailyParkingRecord = mongoose.model('DailyPakingRecord',dailyParkingRecordSchema);
module.exports = DailyParkingRecord;