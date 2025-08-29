const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDB } = require("./config");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const parkingRoutes = require("./routes/parkingRoutes");
const dailyParkingRecordRoutes = require("./routes/dailyParkingRecordRoutes");
const commentParkingRecordRoutes = require('./routes/commentParkingRecordRoutes');
const app = express();
const port = process.env.PORT || 3000;

dotenv.config();

// Conexion a la base de datos
connectDB();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Si tienes CLIENT_URL en .env, forzar ese origen
    if (process.env.CLIENT_URL) {
      if (origin === process.env.CLIENT_URL) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS: " + origin));
    }
    
    if (!origin) return callback(null, true);
    if (
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configutacion de Cookies
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Rutas
app.use("/api/dailyParkingRecord", dailyParkingRecordRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/comment-parking-record", commentParkingRecordRoutes);

const PORT = port;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
