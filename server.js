const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDB } = require("./config");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const parkingRoutes = require("./routes/parkingRoutes");
const dailyParkingRecordRoutes = require("./routes/dailyParkingRecordRoutes");
const app = express();
const port = process.env.PORT || 3000;

dotenv.config();

// Conexion a la base de datos
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas
app.use("/api/dailyParkingRecord", dailyParkingRecordRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

const PORT = port;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
