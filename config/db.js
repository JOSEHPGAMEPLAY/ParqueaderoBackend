const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const dbURI = process.env.dbURI;

        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("Conexión a la base de datos exitosa")
    } catch (error) {
        console.error("Error al conectar la base de datos", error);
        process.exit(1); // Finaliza ell proceso si la conexion falla
    }
};

module.exports = connectDB;
