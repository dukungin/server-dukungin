// migrate-security-pin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');
require('dotenv').config();

async function fixSecurityPin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const users = await User.find({});

  let updated = 0;
  for (let user of users) {
    if (user.securityPin && user.securityPin.length <= 4) { 
      // Masih plain text
      const hashedPin = await bcrypt.hash(user.securityPin, 10);
      user.securityPin = hashedPin;
      await user.save();
      updated++;
      console.log(`✅ Fixed PIN for: ${user.email}`);
    }
  }

  console.log(`🎉 Selesai! ${updated} user telah diperbaiki.`);
  process.exit();
}

fixSecurityPin();