// module.exports = (sequelize, DataTypes) => {
//   const OverlaySetting = sequelize.define('OverlaySetting', {
//     userId: { 
//         type: DataTypes.INTEGER, 
//         allowNull: false 
//     },
//     minDonate: { 
//         type: DataTypes.DECIMAL(10, 2), 
//         defaultValue: 10000 
//     },
//     maxDonate: { 
//         type: DataTypes.DECIMAL(10, 2), 
//         defaultValue: 10000000 
//     },
//     overlayTheme: { 
//         type: DataTypes.STRING, 
//         defaultValue: 'modern' 
//     }, 
//     backgroundColor: { 
//         type: DataTypes.STRING, 
//         defaultValue: '#ffffff' 
//     },
//     textColor: { 
//         type: DataTypes.STRING, 
//         defaultValue: '#000000' 
//     },
//     animationType: { 
//         type: DataTypes.STRING, 
//         defaultValue: 'fade' 
//     },
//     duration: { 
//         type: DataTypes.INTEGER, 
//         defaultValue: 5000 
//     }, 
//     soundUrl: { 
//         type: DataTypes.STRING 
//     },
//     customCss: { 
//         type: DataTypes.TEXT 
//     } 
//   });
//   return OverlaySetting;
// };


// models/overlaySetting.js
const mongoose = require('mongoose');

const overlaySettingSchema = new mongoose.Schema(
  {
    // Relasi ke User — pakai ObjectId, bukan integer
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // 1 user, 1 overlay setting
    },
    minDonate: {
      type: Number,
      default: 10000,
    },
    maxDonate: {
      type: Number,
      default: 10000000,
    },
    overlayTheme: {
      type: String,
      default: 'modern',
    },
    backgroundColor: {
      type: String,
      default: '#ffffff',
    },
    textColor: {
      type: String,
      default: '#000000',
    },
    animationType: {
      type: String,
      default: 'fade',
    },
    duration: {
      type: Number,
      default: 5000,
    },
    soundUrl: String,
    customCss: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('OverlaySetting', overlaySettingSchema);