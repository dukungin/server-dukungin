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


// models/withdrawal.js
const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: String,
    channelCode: String,
    accountNumber: String,
    accountName: String,
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    midtransReference: String,
  },
  { timestamps: true }
);

withdrawalSchema.index({ userId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);