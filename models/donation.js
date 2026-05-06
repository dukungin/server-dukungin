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