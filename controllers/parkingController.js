const ParkingRecord = require("../models/ParkingRecord");
const DailyParkingRecord = require("../models/DailyParkingRecord");

// Obtiene todos los carros parqueados
exports.getAllParkingRecords = async (req, res) => {
    try {
        const records = await ParkingRecord.find();
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtiene todos los registros diarios
exports.getAllDailyParkingRecords = async (req, res) => {
    try {
        const records = await DailyParkingRecord.find();
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtiene los carros parqueados en un registro
exports.getParkingRecordsById = async (req, res) => {
    try {
        // Obtener el ID del registro diario de parqueo desde la solicitud
        const { id } = req.params;

        // Buscar el registro diario de parqueo y cargar toda la información de los carros parqueados
        const parkingRecords = await DailyParkingRecord.findById(id).populate(
            "parkedCars"
        );

        if (!parkingRecords)
            return res.status(404).json({ message: "Registro no encontrado" });

        res.status(200).json(parkingRecords.parkedCars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Elimina un parqueo
exports.deleteParkingRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const parkingRecord = await ParkingRecord.findById(id);
        
        if (!parkingRecord)
            return res
                .status(404)
                .json({ message: "Registro de parqueo no encontrado" });
        const dailyRecordId = parkingRecord.dailyParkingRecord;
        // Actualizar el registro diario para eliminar el carro estacionado
        await DailyParkingRecord.findByIdAndUpdate(
            dailyRecordId,
            { $pull: { parkedCars: id } },
            { new: true } // Para obtener el documento actualizado después de la actualización
        );
        await ParkingRecord.findByIdAndDelete(id);
        res.status(200).json({
            message: "Regitro de parqueo eliminado con éxito",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Elimina un registro
exports.deleteDailyParkingRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const dailyParkingRecord = await DailyParkingRecord.findById(
            id
        ).populate("parkedCars");

        if (!dailyParkingRecord)
            return res
                .status(404)
                .json({ message: "Registro de parqueo no encontrado" });

        for (const parkingRecord of dailyParkingRecord.parkedCars) {
            await ParkingRecord.findByIdAndDelete(parkingRecord._id);
        }

        await DailyParkingRecord.findByIdAndDelete(id);

        res.status(200).json({
            message: "Registro de parqueo eliminado con exito",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Agrega un registro
exports.addDailyParking = async (req, res) => {
    try {
        // Obtener la hora actual en UTC
        const currentTimeUTC = new Date();

        // Obtener el desplazamiento de la zona horaria de Colombia en milisegundos
        const offsetColombia = -300 * 60 * 1000; // UTC-5 (Bogotá)

        // Obtener la fecha actual en la zona horaria de Colombia
        const currentDate = new Date(currentTimeUTC.getTime() + offsetColombia);
        currentDate.setUTCHours(0, 0, 0, 0); // Establecer la hora a 00:00:00 en la zona horaria de Colombia

        // Buscar un registro diario basado en la fecha actual
        let dailyParkingRecord = await DailyParkingRecord.findOne({
            date: currentDate,
        });

        if (!dailyParkingRecord) {
            dailyParkingRecord = new DailyParkingRecord({
                date: currentDate,
            });
        }
        await dailyParkingRecord.save();

        res.status(201).json({
            message: "Registro creado con éxito",
            _id: dailyParkingRecord._id,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Agrega un carro al parqueadero
exports.addCarToParking = async (req, res) => {
    try {
        const { plateNumber } = req.body;

        // Obtener la hora actual en UTC
        const currentTimeUTC = new Date();

        // Obtener el desplazamiento de la zona horaria de Colombia en milisegundos
        const offsetColombia = -300 * 60 * 1000; // UTC-5 (Bogotá)

        // Crear un nuevo objeto Date con la hora en la zona horaria de Colombia
        const entryTime = new Date(currentTimeUTC.getTime() + offsetColombia);

        // Obtener la fecha actual en la zona horaria de Colombia
        const currentDate = new Date(currentTimeUTC.getTime() + offsetColombia);
        currentDate.setUTCHours(0, 0, 0, 0); // Establecer la hora a 00:00:00 en la zona horaria de Colombia

        // Buscar un registro diario basado en la fecha actual
        let dailyParkingRecord = await DailyParkingRecord.findOne({
            date: currentDate,
        });

        if (!dailyParkingRecord) {
            dailyParkingRecord = new DailyParkingRecord({
                date: currentDate,
            });
        }

        // Buscar si ya ingreso esa placa y la hora de salida es diferente de null
        let parkingRecord = await ParkingRecord.findOne({
            plateNumber: plateNumber,
            exitTime: null,
        });

        if (parkingRecord)
            return res.status(404).json({ message: "El carro ya ingreso" });

        parkingRecord = new ParkingRecord({
            plateNumber,
            entryTime: entryTime,
            dailyParkingRecord: dailyParkingRecord._id,
        });

        dailyParkingRecord.parkedCars.push(parkingRecord);
        await parkingRecord.save();
        await dailyParkingRecord.save();

        res.status(201).json({ message: "Carro ingresado con éxito" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Calcular el precio al salir del parqueadero
exports.calculatePrice = async (req, res) => {
    try {
        const { plateNumber, isFree } = req.body;

        const parkingRecord = await ParkingRecord.findOne({
            plateNumber,
            exitTime: null,
        });

        if (!parkingRecord) {
            return res
                .status(404)
                .json({ message: "El carro no se ah encontrado" });
        }

        // Obtener la hora actual en UTC
        const currentTimeUTC = new Date();

        // Obtener el desplazamiento de la zona horaria de Colombia en milisegundos
        const offsetColombia = -300 * 60 * 1000; // UTC-5 (Bogotá)

        // Crear un nuevo objeto Date con la hora en la zona horaria de Colombia
        const exitTime = new Date(currentTimeUTC.getTime() + offsetColombia);

        parkingRecord.exitTime = exitTime;

        parkingRecord.isFree = isFree;

        await parkingRecord.save();

        const price = parkingRecord.price;

        res.status(200).json({ message: "Precio calculado con exito", price });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Calcula el total ganado
exports.calculateTotalEarned = async (req, res) => {
    try {
        // Obtener el ID del registro diario de parqueo desde la solicitud
        const { id } = req.params;

        // Buscar el registro diario de parqueo por su ID y poblado con los registros de estacionamiento
        const dailyParkingRecord = await DailyParkingRecord.findById(
            id
        ).populate("parkedCars");

        if (!dailyParkingRecord) {
            return res
                .status(404)
                .json({ message: "Registro diario de parqueo no encontrado" });
        }

        // Calcular el total ganado sumando los precios de los elementos en parkedCars
        let totalEarned = 0;
        for (const parkingRecord of dailyParkingRecord.parkedCars) {
            totalEarned += parkingRecord.price;
        }

        // Actualizar el campo totalEarned en el registro diario de parqueo
        dailyParkingRecord.totalEarned = totalEarned;
        await dailyParkingRecord.save();

        res.status(200).json({
            message: "Total ganado calculado y actualizado con éxito",
            totalEarned,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar la placa del carro
exports.updatePlateNumber = async (req, res) => {
    try {
        const { id } = req.params;
        const { plateNumber } = req.body;

        const parkingRecord = await ParkingRecord.findOne({
            _id: id,
            exitTime: null,
        });
        if (!parkingRecord)
            return res.status(404).json({ message: "Registro no encontrado" });

        parkingRecord.plateNumber = plateNumber;

        await parkingRecord.save();

        res.status(200).json({
            message: "Placa de carro actualizada con exito",
            parkingRecord,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
