// // config/database.js
// const { Sequelize } = require('sequelize');
// require('dotenv').config();

// const sequelize = new Sequelize(
//   process.env.DB_NAME || 'db_donate', 
//   process.env.DB_USER || 'root', 
//   process.env.DB_PASS || '', 
//   {
//     host: process.env.DB_HOST || '127.0.0.1',
//     dialect: 'mysql',
//     logging: false, // Set true jika ingin lihat query SQL di terminal
//   }
// );

// module.exports = sequelize;


// config/database.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/db_donate', {
      // mongoose 6+ tidak butuh opsi useNewUrlParser dll, tapi safe untuk disertakan
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;