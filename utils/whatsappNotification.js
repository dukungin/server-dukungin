// utils/whatsappNotification.js
const { getClient, getIsReady, waitUntilReady } = require('../config/whatsapp');

const ADMIN_WA_NUMBER = '089513093406'; // Nomor admin yang menerima notifikasi

const formatRupiah = (num) => new Intl.NumberFormat('id-ID').format(Math.round(num));

/**
 * Kirim notifikasi withdrawal ke admin
 * @param {Object} data - Data withdrawal
 * @param {string} data.username - Username streamer yang menarik
 * @param {number} data.amount - Jumlah penarikan
 * @param {string} data.paymentMethod - Metode pembayaran (BANK/DANA)
 * @param {string} data.channelCode - Kode bank/channel
 * @param {string} data.accountNumber - Nomor rekening/handphone
 * @param {string} data.accountName - Nama pemilik akun
 */
const sendWithdrawalNotification = async (data) => {
  try {
    console.log('[WA] Mencoba kirim notifikasi withdrawal...');
    
    // Tunggu sampai WA ready (max 30 detik)
    await waitUntilReady(30000);
    
    const client = getClient();
    if (!client || !getIsReady()) {
      console.log('[WA] ❌ Client belum ready, skip notifikasi');
      return false;
    }

    const chatId = `${ADMIN_WA_NUMBER}@c.us`;
    
    const message = `🔔 *PERMINTAAN PENARIKAN BARU*

👤 *Streamer:* @${data.username}
💰 *Jumlah:* Rp ${formatRupiah(data.amount)}
🏦 *Metode:* ${data.paymentMethod}
🏛️ *Bank/Channel:* ${data.channelCode}
🔢 *Rekening:* ${data.accountNumber}
👤 *Nama:* ${data.accountName}

⏰ *Waktu:* ${new Date().toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })}

Silakan proses di dashboard admin!`;

    await client.sendMessage(chatId, message);
    console.log(`[WA] ✅ Notifikasi withdrawal terkirim ke ${ADMIN_WA_NUMBER}`);
    return true;
    
  } catch (err) {
    console.error('[WA] ❌ Gagal kirim notifikasi withdrawal:', err.message);
    return false;
  }
};

/**
 * Kirim notifikasi donasi masuk ke admin (opsional)
 * @param {Object} data - Data donasi
 */
const sendDonationNotification = async (data) => {
  try {
    console.log('[WA] Mencoba kirim notifikasi donasi...');
    
    await waitUntilReady(30000);
    
    const client = getClient();
    if (!client || !getIsReady()) {
      console.log('[WA] ❌ Client belum ready, skip notifikasi');
      return false;
    }

    const chatId = `${ADMIN_WA_NUMBER}@c.us`;
    
    const message = `💖 *DONASI MASUK*

👤 *Donor:* ${data.donorName}
💰 *Jumlah:* Rp ${formatRupiah(data.amount)}
🎁 *Untuk:* @${data.streamerUsername}
${data.message ? `💬 *Pesan:* ${data.message}` : ''}

⏰ *Waktu:* ${new Date().toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })}`;

    await client.sendMessage(chatId, message);
    console.log(`[WA] ✅ Notifikasi donasi terkirim ke ${ADMIN_WA_NUMBER}`);
    return true;
    
  } catch (err) {
    console.error('[WA] ❌ Gagal kirim notifikasi donasi:', err.message);
    return false;
  }
};

module.exports = {
  sendWithdrawalNotification,
  sendDonationNotification,
  ADMIN_WA_NUMBER
};