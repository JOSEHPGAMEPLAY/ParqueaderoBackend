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

    const millisecondsInHour = 1000 * 60 * 60;
    const millisecondsInQuarterHour = millisecondsInHour / 10;

    // Calcular la diferencia en milisegundos
    const differenceInMilliseconds = this.exitTime - this.entryTime;
    
    // Convertir la diferencia en horas y fracción de horas
    const fullHours = Math.floor(differenceInMilliseconds / millisecondsInHour);
    const remainingMilliseconds = differenceInMilliseconds % millisecondsInHour;

    // Si los minutos restantes son mayores que un cuarto de hora, sumar una hora completa
    const additionalHour = remainingMilliseconds > millisecondsInQuarterHour ? 1 : 0;

    const totalHours = fullHours + additionalHour;
    
    if (totalHours === 0)  return (1 * process.env.PRICE);
    
    return totalHours * process.env.PRICE;
};


// Middleware para calcular el price antes de guardar
parkingRecordSchema.pre('save', function(next){
    this.price = this.calculatePrice();
    next();
})

const ParkingRecord = mongoose.model('ParkingRecord', parkingRecordSchema);
module.exports = ParkingRecord;