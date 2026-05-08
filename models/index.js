// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const User = require('./user')(sequelize, DataTypes);
// const Donation = require('./donation')(sequelize, DataTypes);
// const OverlaySetting = require('./overlaySetting')(sequelize, DataTypes);
// const Withdrawal = require('./withdrawl')(sequelize, DataTypes);

// // Definisi Relasi
// User.hasOne(OverlaySetting, { foreignKey: 'userId' });
// OverlaySetting.belongsTo(User, { foreignKey: 'userId' });

// User.hasMany(Donation, { foreignKey: 'userId' });
// Donation.belongsTo(User, { foreignKey: 'userId' });

// User.hasMany(Withdrawal, { foreignKey: 'userId' });
// Withdrawal.belongsTo(User, { foreignKey: 'userId' });

// module.exports = {
//   sequelize,
//   User,
//   Donation,
//   OverlaySetting,
//   Withdrawal
// };


// models/index.js
// Di MongoDB/Mongoose tidak ada sequelize instance atau relasi foreign key
// yang harus didefinisikan secara eksplisit — relasi dikelola via populate().
// File ini hanya mengekspor semua model agar import tetap konsisten.

const User         = require('./user');
const Donation     = require('./donation');
const OverlaySetting = require('./overlaySetting');
const Withdrawal   = require('./withdrawl');

module.exports = {
  User,
  Donation,
  OverlaySetting,
  Withdrawal,
};