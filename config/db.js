const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.dbURI || process.env.DB_URI;
    await mongoose.connect(uri);
    console.log('Conexión a la base de datos exitosa');
  } catch (error) {
    console.error('Error al conectar la base de datos:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
