// reset-pin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');
require('dotenv').config();

async function resetAllPin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const hashedPin = await bcrypt.hash('0000', 10);

  const result = await User.updateMany({}, { $set: { securityPin: hashedPin } });

  console.log(`🎉 Selesai! ${result.modifiedCount} user PIN direset ke 0000`);
  process.exit();
}

resetAllPin();