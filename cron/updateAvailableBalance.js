// cron/updateAvailableBalance.js
const { User, Donation } = require('../models');

/**
 * Cron ini dijalankan setiap 1 menit (dari server.js)
 * 
 * LOGIKA:
 * - Donasi baru masuk → availableAt = createdAt + 24 jam (diset di webhook)
 * - Cron ini cek: donasi mana yang availableAt <= sekarang tapi belum di-release
 * - Kalau sudah waktunya → tambah availableBalance user & tandai isAvailable = true
 */
async function updateAvailableBalance() {
  try {
    const now = new Date();

    // Cari donasi PAID yang:
    // 1. availableAt sudah <= sekarang (sudah waktunya)
    // 2. isAvailable masih false (belum di-release ke availableBalance)
    const readyDonations = await Donation.find({
      status: 'PAID',
      isAvailable: { $ne: true },   // belum di-release
      availableAt: { $lte: now },    // sudah waktunya
    }).lean();

    if (readyDonations.length === 0) return;

    console.log(`[Cron] ${readyDonations.length} donasi siap di-release ke availableBalance`);

    for (const donation of readyDonations) {
      // Jumlah yang masuk ke availableBalance = streamerReceive (sudah dipotong 2.5%)
      // Kalau streamerReceive tidak ada (donasi lama), fallback ke amount
      const releaseAmount = parseFloat(donation.streamerReceive || donation.amount || 0);
      if (!releaseAmount || releaseAmount <= 0) continue;

      // Tambah availableBalance user
      await User.findByIdAndUpdate(donation.userId, {
        $inc: { availableBalance: releaseAmount },
      });

      // Tandai donasi sudah di-release
      await Donation.findByIdAndUpdate(donation._id, {
        $set: { isAvailable: true },
      });

      console.log(`[Cron] Released Rp${releaseAmount} untuk userId ${donation.userId}`);
    }

    console.log(`[Cron] Done — ${readyDonations.length} donasi di-release`);
  } catch (err) {
    console.error('[Cron] Error updateAvailableBalance:', err.message);
  }
}

module.exports = updateAvailableBalance;