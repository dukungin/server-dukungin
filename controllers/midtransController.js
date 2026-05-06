const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const { Donation, Withdrawal, User, sequelize } = require('../models');

// ============================================================
// DETEKSI ENVIRONMENT
// ============================================================
const isProduction = process.env.NODE_ENV === 'production';

const SERVER_KEY = isProduction
  ? process.env.MIDTRANS_SERVER_KEY
  : process.env.DEV_MIDTRANS_SERVER_KEY;

const CLIENT_KEY = isProduction
  ? process.env.MIDTRANS_CLIENT_KEY
  : process.env.DEV_MIDTRANS_CLIENT_KEY;

const BASE_URL = isProduction
  ? process.env.FRONTEND_URL
  : process.env.DEV_FRONTEND_URL || 'http://localhost:5173';

console.log(`[Midtrans] Mode: ${isProduction ? 'PRODUCTION 🚀' : 'SANDBOX 🧪'}`);
console.log('[createDonation] NODE_ENV:', process.env.NODE_ENV);
console.log('[createDonation] isProduction:', isProduction);
console.log('[createDonation] SERVER_KEY prefix:', SERVER_KEY?.substring(0, 25));

// ============================================================
// INISIALISASI MIDTRANS SNAP
// ============================================================
const snap = new midtransClient.Snap({
  isProduction,
  serverKey: SERVER_KEY,
  clientKey: CLIENT_KEY,
});

// ============================================================
// HELPER: Verifikasi Signature Webhook Midtrans
// ============================================================
const verifyMidtransSignature = (orderId, statusCode, grossAmount, signatureKey) => {
  const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${SERVER_KEY}`)
    .digest('hex');
  return hash === signatureKey;
};

// ============================================================
// CREATE DONATION
// ============================================================
exports.createDonation = async (req, res) => {
  const { amount, donorName, message, userId, email } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({ message: 'Amount dan userId wajib diisi' });
  }

  const orderId = `donasi-${userId}-${Date.now()}`;

  try {
    const streamer = await User.findByPk(userId);
    const streamerUsername = streamer?.username || userId;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(Number(amount)),
      },
      customer_details: {
        first_name: donorName || 'Anonim',
        email: email || 'guest@mail.com',
      },
      item_details: [
        {
          id: 'DONASI',
          price: Math.round(Number(amount)),
          quantity: 1,
          name: `Donasi untuk @${streamerUsername}`,
        },
      ],
      callbacks: {
        finish: `${BASE_URL}/donation/success?username=${streamerUsername}`,
        error: `${BASE_URL}/donation/failed?username=${streamerUsername}`,
        pending: `${BASE_URL}/donation/pending?username=${streamerUsername}`,
      },
    };

    const snapResponse = await snap.createTransaction(parameter);

    await Donation.create({
      externalId: orderId,
      userId,
      amount: Math.round(Number(amount)),
      donorName: donorName || 'Anonim',
      message: message || '',
      paymentUrl: snapResponse.redirect_url,
      status: 'PENDING',
    });

    res.json({
      url: snapResponse.redirect_url,
      token: snapResponse.token,
    });
  } catch (err) {
    console.error('[Midtrans Error]:', err);
    res.status(500).json({
      message: 'Midtrans Error',
      details: err?.ApiResponse || err.message,
    });
  }
};

// ============================================================
// WEBHOOK — NOTIFIKASI TRANSAKSI
// ============================================================
exports.handleWebhook = async (req, res) => {
  console.log('\n========== [WEBHOOK MIDTRANS MASUK] ==========');
  console.log('[Webhook] Body:', JSON.stringify(req.body, null, 2));

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
    payment_type,
  } = req.body;

  // 1. Verifikasi signature
  const isValid = verifyMidtransSignature(order_id, status_code, gross_amount, signature_key);
  console.log(`[Webhook] Signature valid: ${isValid}`);

  if (!isValid) {
    console.warn('[Webhook] ❌ Signature tidak valid — request ditolak');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  console.log(`[Webhook] order_id: ${order_id}`);
  console.log(`[Webhook] transaction_status: ${transaction_status}`);
  console.log(`[Webhook] fraud_status: ${fraud_status}`);
  console.log(`[Webhook] payment_type: ${payment_type}`);

  // 2. Cek apakah sukses
  const isSuccess =
    transaction_status === 'settlement' ||
    (transaction_status === 'capture' && fraud_status === 'accept');

  console.log(`[Webhook] isSuccess: ${isSuccess}`);

  if (isSuccess) {
    try {
      // 3. Cari donasi di DB
      console.log(`[Webhook] Mencari donasi dengan externalId: ${order_id}`);
      const dataDonasi = await Donation.findOne({
        where: { externalId: order_id },
        include: [{ model: User }],
      });

      if (!dataDonasi) {
        console.warn(`[Webhook] ❌ Donasi tidak ditemukan di DB untuk order_id: ${order_id}`);
        return res.status(200).json({ message: 'OK' });
      }

      console.log(`[Webhook] ✅ Donasi ditemukan: ID=${dataDonasi.id}, status saat ini=${dataDonasi.status}`);

      // 4. Idempotency check
      if (dataDonasi.status === 'PAID') {
        console.log(`[Webhook] ⚠️ Donasi sudah PAID sebelumnya — skip`);
        return res.status(200).json({ message: 'OK' });
      }

      // 5. Update status donasi
      dataDonasi.status = 'PAID';
      await dataDonasi.save();
      console.log(`[Webhook] ✅ Status donasi diupdate ke PAID`);

      // 6. Update wallet streamer
      const streamer = dataDonasi.User;
      if (!streamer) {
        console.warn(`[Webhook] ❌ User/streamer tidak ditemukan untuk donasi ini`);
        return res.status(200).json({ message: 'OK' });
      }

      const walletBefore = parseFloat(streamer.walletBalance || 0);
      streamer.walletBalance = walletBefore + parseFloat(dataDonasi.amount);
      await streamer.save();

      console.log(`[Webhook] ✅ Wallet @${streamer.username}: Rp${walletBefore} → Rp${streamer.walletBalance}`);

      // 7. Emit socket ke overlay
      console.log(`[Webhook] Mencoba emit socket ke overlay token: ${streamer.overlayToken}`);

      try {
        const io = req.app.get('socketio');

        if (!io) {
          console.error('[Webhook] ❌ socketio tidak ditemukan di app — pastikan app.set("socketio", io) di server.js');
        } else {
          const room = streamer.overlayToken;
          const socketsInRoom = await io.in(room).fetchSockets();
          console.log(`[Webhook] Jumlah client di room "${room}": ${socketsInRoom.length}`);

          if (socketsInRoom.length === 0) {
            console.warn(`[Webhook] ⚠️ Tidak ada client yang terkoneksi di room "${room}" — overlay mungkin belum dibuka`);
          }

          const payload = {
            donorName: dataDonasi.donorName,
            amount: dataDonasi.amount,
            message: dataDonasi.message,
          };

          io.to(room).emit('new-donation', payload);
          console.log(`[Webhook] ✅ Socket emit "new-donation" ke room "${room}":`, payload);
        }
      } catch (socketErr) {
        console.error('[Webhook] ❌ Socket emit gagal:', socketErr.message);
      }

    } catch (err) {
      console.error('[Webhook] ❌ Error saat proses PAID:', err);
    }
  }

  // 8. Handle expire
  if (transaction_status === 'expire') {
    console.log(`[Webhook] Donasi expired: ${order_id}`);
    try {
      const updated = await Donation.update(
        { status: 'EXPIRED' },
        { where: { externalId: order_id, status: 'PENDING' } }
      );
      console.log(`[Webhook] ✅ ${updated[0]} donasi diupdate ke EXPIRED`);
    } catch (err) {
      console.error('[Webhook] ❌ Gagal update EXPIRED:', err);
    }
  }

  console.log('========== [WEBHOOK SELESAI] ==========\n');
  res.status(200).json({ message: 'OK' });
};

// ============================================================
// REQUEST WITHDRAWAL — Manual
// ============================================================
exports.requestWithdrawal = async (req, res) => {
  const { amount, paymentMethod, channelCode, accountNumber, accountName } = req.body;
  const userId = req.user.id;

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Nominal tidak valid' });
  }
  if (parseFloat(amount) < 10000) {
    return res.status(400).json({ message: 'Minimal penarikan adalah Rp 10.000' });
  }
  if (!channelCode || !accountNumber || !accountName) {
    return res.status(400).json({ message: 'Data rekening/e-wallet tidak lengkap' });
  }

  const FEE = 5000;
  const totalDeduct = parseFloat(amount) + FEE;
  const t = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId, { transaction: t, lock: true });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (parseFloat(user.walletBalance) < totalDeduct) {
      await t.rollback();
      return res.status(400).json({
        message: `Saldo tidak mencukupi. Dibutuhkan Rp ${totalDeduct.toLocaleString('id-ID')} (termasuk biaya admin Rp 5.000)`,
      });
    }

    user.walletBalance = parseFloat(user.walletBalance) - totalDeduct;
    await user.save({ transaction: t });

    const referenceNo = `wd-${userId}-${Date.now()}`;

    await Withdrawal.create(
      {
        userId,
        amount: parseFloat(amount),
        paymentMethod,
        channelCode,
        accountNumber,
        accountName,
        status: 'PENDING',
        midtransReference: referenceNo,
      },
      { transaction: t }
    );

    await t.commit();
    console.log(`[requestWithdrawal] @${user.username} request WD Rp${amount} via ${channelCode}`);

    res.json({
      message: 'Permintaan penarikan berhasil diajukan. Dana akan ditransfer admin dalam 1x24 jam.',
      referenceNo,
    });
  } catch (err) {
    await t.rollback();
    console.error('[requestWithdrawal] Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// GET WITHDRAWAL HISTORY
// ============================================================
exports.getWithdrawalHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const withdrawals = await Withdrawal.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    res.json(withdrawals);
  } catch (err) {
    console.error('[getWithdrawalHistory] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// [ADMIN] GET SEMUA PENDING WITHDRAWAL
// ============================================================
exports.adminGetPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.findAll({
      where: { status: 'PENDING' },
      include: [{ model: User, attributes: ['username', 'email'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json(withdrawals);
  } catch (err) {
    console.error('[adminGetPendingWithdrawals] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// [ADMIN] UPDATE STATUS WITHDRAWAL
// ============================================================
exports.adminUpdateWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['COMPLETED', 'FAILED'].includes(status)) {
    return res.status(400).json({ message: 'Status harus COMPLETED atau FAILED' });
  }

  const t = await sequelize.transaction();

  try {
    const withdrawal = await Withdrawal.findByPk(id, {
      include: [{ model: User }],
      transaction: t,
      lock: true,
    });

    if (!withdrawal) {
      await t.rollback();
      return res.status(404).json({ message: 'Withdrawal tidak ditemukan' });
    }

    if (withdrawal.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ message: `Withdrawal sudah berstatus ${withdrawal.status}` });
    }

    withdrawal.status = status;
    await withdrawal.save({ transaction: t });

    if (status === 'FAILED') {
      const user = withdrawal.User;
      if (user) {
        const refundAmount = parseFloat(withdrawal.amount) + 5000;
        user.walletBalance = parseFloat(user.walletBalance || 0) + refundAmount;
        await user.save({ transaction: t });
        console.log(`[adminUpdateWithdrawal] FAILED — Rp${refundAmount} dikembalikan ke @${user.username}`);
      }
    }

    await t.commit();
    console.log(`[adminUpdateWithdrawal] WD #${id} → ${status}`);
    res.json({ message: `Withdrawal diupdate ke ${status}` });
  } catch (err) {
    await t.rollback();
    console.error('[adminUpdateWithdrawal] Error:', err);
    res.status(500).json({ error: err.message });
  }
};