// migrate-add-isActive.js
const mongoose = require('mongoose');
const { User } = require('./models');
require('dotenv').config();

async function migrateIsActive() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Hanya update dokumen yang belum punya field isActive
  const result = await User.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );

  console.log(`🎉 Selesai! ${result.modifiedCount} user diperbarui (isActive: true)`);

  // Verifikasi
  const total      = await User.countDocuments();
  const withActive = await User.countDocuments({ isActive: { $exists: true } });
  console.log(`📊 Total user: ${total} | Sudah punya isActive: ${withActive}`);

  process.exit(0);
}

migrateIsActive().catch((err) => {
  console.error('❌ Migration gagal:', err);
  process.exit(1);
});