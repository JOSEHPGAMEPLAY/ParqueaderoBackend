const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config');
const { errorHandler } = require('./utils/errors');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const parkingRoutes = require('./routes/parkingRoutes');
const dailyParkingRecordRoutes = require('./routes/dailyParkingRecordRoutes');
const commentParkingRecordRoutes = require('./routes/commentParkingRecordRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o)) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/parking/comment', commentParkingRecordRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/dailyParkingRecord', dailyParkingRecordRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
 console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
