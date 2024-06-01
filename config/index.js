require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const connectDB = require('./db');

module.exports = {
    connectDB,
};