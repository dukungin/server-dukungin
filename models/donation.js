// module.exports = (sequelize, DataTypes) => {
//   return sequelize.define('Donation', {
//     externalId: { type: DataTypes.STRING, unique: true }, // order_id yang dikirim ke Midtrans
//     userId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     donorName: { type: DataTypes.STRING, defaultValue: 'Anonim' },
//     amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
//     message: { type: DataTypes.TEXT },
//     status: {
//       type: DataTypes.ENUM('PENDING', 'PAID', 'EXPIRED'),
//       defaultValue: 'PENDING',
//     },
//     paymentUrl: { type: DataTypes.STRING }, // Snap redirect_url
//   });
// };


// models/donation.js
const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      unique: true, // order_id dari Midtrans
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    donorName: {
      type: String,
      default: 'Anonim',
    },
    amount: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'EXPIRED'],
      default: 'PENDING',
    },
    mediaUrl:  { type: String, default: null },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    paymentUrl: String, // Snap redirect_url
  },
  { timestamps: true }
);

donationSchema.index({ userId: 1, createdAt: -1 });
donationSchema.index({ status: 1 });

module.exports = mongoose.model('Donation', donationSchema);