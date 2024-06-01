const mongoose = require("mongoose");

const parkingRecordSchema = new mongoose.Schema({
    plateNumber: { type: String, required: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date, default: null },
    price: { type: Number, default: 0,required: true },
    dailyParkingRecord: {type:mongoose.Schema.Types.ObjectId, ref:'DailyPakingRecord'}
});

// Metodo para calcular el price
parkingRecordSchema.methods.calculatePrice = function () {
    if (!this.exitTime) return 0;
    const diffInHours = Math.ceil(
        (this.exitTime - this.entryTime) / (1000 * 60 * 60)
    );
    return diffInHours * 1000;
};


// Middleware para calcular el price antes de guardar
parkingRecordSchema.pre('save', function(next){
    this.price = this.calculatePrice();
    next();
})

const ParkingRecord = mongoose.model('ParkingRecord', parkingRecordSchema);
module.exports = ParkingRecord;