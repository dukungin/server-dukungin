const { Xendit } = require('xendit-node');
const { Donation, Withdrawal, User, sequelize } = require('../models');

// ✅ Inisialisasi sekali, akses langsung dari xenditClient
const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY,
});

const toE164 = (phone) => {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0'))   return '+62' + cleaned.slice(1);
  if (cleaned.startsWith('62'))  return '+' + cleaned;
  if (phone.startsWith('+62'))   return phone;
  return undefined;
};

// ============================================================
// CREATE DONATION INVOICE
// ============================================================
exports.createDonation = async (req, res) => {
  const { amount, donorName, message, userId, paymentMethods, email, mobileNumber } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({ message: 'Amount dan userId wajib diisi' });
  }

  const externalId = `donasi-${userId}-${Date.now()}`;

  try {
    const filteredMethods =
      paymentMethods && !paymentMethods.includes('ALL') ? paymentMethods : null;

    const streamer = await User.findByPk(userId);
    const streamerUsername = streamer?.username || userId;
    const safeMobile = toE164(mobileNumber);

    const response = await xenditClient.Invoice.createInvoice({
      data: {
        externalId,
        amount: Math.round(Number(amount)),
        description: `Donasi untuk @${streamerUsername} - ${donorName || 'Anonim'}`,
        currency: 'IDR',
        customer: {
          givenNames: donorName || 'Anonim',
          ...(safeMobile && { mobileNumber: safeMobile }),
          email: email || 'guest@mail.com',
        },
        ...(filteredMethods && { paymentMethods: filteredMethods }),
        successRedirectUrl: `${process.env.FRONTEND_URL}/donation/success?username=${streamerUsername}`,
        failureRedirectUrl: `${process.env.FRONTEND_URL}/donation/failed?username=${streamerUsername}`,
      },
    });

    await Donation.create({
      externalId,
      userId,
      amount: Math.round(Number(amount)),
      donorName: donorName || 'Anonim',
      message: message || '',
      paymentUrl: response.invoiceUrl,
      status: 'PENDING',
    });

    res.json({ url: response.invoiceUrl });
  } catch (err) {
    console.error('[Xendit Error]:', JSON.stringify(err.response?.data || err, null, 2));
    res.status(500).json({
      message: 'Xendit Error',
      details: err.response?.data || err.message,
    });
  }
};

// ============================================================
// WEBHOOK — INVOICE (Donasi Masuk)
// ✅ FIX: Socket emit dibungkus try-catch terpisah agar tidak
//         mengganggu update status donation yang sudah berhasil
// ============================================================
exports.handleWebhook = async (req, res) => {
  const callbackToken = req.headers['x-callback-token'];
  if (callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
    console.warn('[handleWebhook] Unauthorized webhook attempt');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { external_id, status } = req.body;

  if (status === 'PAID') {
    try {
      const dataDonasi = await Donation.findOne({
        where: { externalId: external_id },
        include: [{ model: User }],
      });

      // Idempotency: jangan proses ulang jika sudah PAID
      if (dataDonasi && dataDonasi.status !== 'PAID') {
        dataDonasi.status = 'PAID';
        await dataDonasi.save();

        const streamer = dataDonasi.User;
        if (streamer) {
          streamer.walletBalance =
            parseFloat(streamer.walletBalance || 0) + parseFloat(dataDonasi.amount);
          await streamer.save();

          console.log(
            `[handleWebhook] Donasi PAID: Rp${dataDonasi.amount} → @${streamer.username}`
          );

          // ✅ FIX: Socket emit di try-catch terpisah
          // Kalau socket gagal, donation & wallet tetap terupdate
          try {
            const io = req.app.get('socketio');
            io.to(streamer.overlayToken).emit('new-donation', {
              donorName: dataDonasi.donorName,
              amount: dataDonasi.amount,
              message: dataDonasi.message,
            });
          } catch (socketErr) {
            console.error('[handleWebhook] Socket emit gagal:', socketErr.message);
          }
        }
      }
    } catch (err) {
      console.error('[handleWebhook] Error:', err);
      // Tetap 200 agar Xendit tidak retry terus
    }
  }

  res.status(200).send('OK');
};

// ============================================================
// WEBHOOK — DISBURSEMENT (Update Status Withdrawal)
// ============================================================
exports.handleDisbursementWebhook = async (req, res) => {
  const callbackToken = req.headers['x-callback-token'];
  if (callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
    console.warn('[handleDisbursementWebhook] Unauthorized');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { external_id, status, failure_code } = req.body;

  try {
    const withdrawal = await Withdrawal.findOne({
      where: { xenditReference: external_id },
      include: [{ model: User }],
    });

    if (!withdrawal) {
      console.warn(`[handleDisbursementWebhook] Tidak ditemukan: ${external_id}`);
      return res.status(200).send('OK');
    }

    // Idempotency: skip jika sudah final
    if (withdrawal.status === 'COMPLETED' || withdrawal.status === 'FAILED') {
      return res.status(200).send('OK');
    }

    if (status === 'COMPLETED') {
      withdrawal.status = 'COMPLETED';
      await withdrawal.save();
      console.log(
        `[handleDisbursementWebhook] COMPLETED: Rp${withdrawal.amount} → ${withdrawal.accountNumber}`
      );
    } else if (status === 'FAILED') {
      withdrawal.status = 'FAILED';
      await withdrawal.save();

      const user = withdrawal.User;
      if (user) {
        user.walletBalance =
          parseFloat(user.walletBalance || 0) + parseFloat(withdrawal.amount);
        await user.save();
        console.log(
          `[handleDisbursementWebhook] FAILED (${failure_code}), saldo dikembalikan ke @${user.username}`
        );
      }
    }
  } catch (err) {
    console.error('[handleDisbursementWebhook] Error:', err);
  }

  res.status(200).send('OK');
};

// ============================================================
// REQUEST WITHDRAWAL
// ✅ FIX: Pakai Sequelize transaction agar potong saldo +
//         create Withdrawal record atomic — tidak ada kondisi
//         Xendit berhasil tapi record tidak tersimpan
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

  // ✅ Buka DB transaction
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

    // Potong saldo dalam transaction
    user.walletBalance = parseFloat(user.walletBalance) - totalDeduct;
    await user.save({ transaction: t });

    const externalId = `wd-${userId}-${Date.now()}`;

    // Hubungi Xendit — di luar transaction karena external call
    let disbursementResponse;
    try {
      disbursementResponse = await xenditClient.Disbursement.create({
        data: {
          externalId,
          bankCode: channelCode,
          accountHolderName: accountName,
          accountNumber,
          amount: parseFloat(amount),
          description: `Withdrawal @${user.username} via ${paymentMethod}`,
        },
      });
    } catch (xenditErr) {
      // ✅ Xendit gagal → rollback seluruh transaction (saldo kembali)
      await t.rollback();
      console.error('[requestWithdrawal] Xendit error:', JSON.stringify(xenditErr, null, 2));
      return res.status(502).json({
        message: 'Gagal menghubungi payment gateway. Silakan coba beberapa saat lagi.',
      });
    }

    // ✅ Xendit berhasil → simpan record dalam transaction yang sama
    await Withdrawal.create(
      {
        userId,
        amount: parseFloat(amount),
        paymentMethod,
        channelCode,
        accountNumber,
        accountName,
        status: 'PENDING',
        xenditReference: externalId,
      },
      { transaction: t }
    );

    // ✅ Commit — potong saldo + record withdrawal sekaligus
    await t.commit();

    console.log(`[requestWithdrawal] @${user.username} WD Rp${amount} via ${channelCode}`);

    res.json({
      message: 'Permintaan penarikan sedang diproses. Dana akan masuk dalam beberapa menit.',
      xenditId: disbursementResponse.id,
    });
  } catch (err) {
    // Rollback kalau ada error tak terduga
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