// module.exports = (sequelize, DataTypes) => {
//   return sequelize.define('Withdrawal', {
//     userId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     amount: {
//       type: DataTypes.DECIMAL(15, 2),
//       allowNull: false,
//     },
//     // 'BANK', 'DANA', 'GOPAY'
//     paymentMethod: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     // Kode Bank (BCA/BNI/MANDIRI) atau E-Wallet (DANA/OVO/GOPAY)
//     channelCode: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     accountNumber: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     accountName: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     status: {
//       type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
//       defaultValue: 'PENDING',
//     },
//     // Ini adalah externalId yang kita kirim ke Xendit (format: wd-userId-timestamp)
//     // Xendit akan kirim balik nilai ini di webhook sebagai `external_id`
//     xenditReference: {
//       type: DataTypes.STRING,
//       unique: true, // Harus unik untuk idempotency
//     },
//   });
// };

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Donation', {
    externalId: { type: DataTypes.STRING, unique: true }, // order_id yang dikirim ke Midtrans
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    donorName: { type: DataTypes.STRING, defaultValue: 'Anonim' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    message: { type: DataTypes.TEXT },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'EXPIRED'),
      defaultValue: 'PENDING',
    },
    paymentUrl: { type: DataTypes.STRING }, // Snap redirect_url
  });
};