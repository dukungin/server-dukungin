// const express = require('express');
// const router = express.Router();
// const midtransCtrl = require('../controllers/midtransController');
// const authMiddleware = require('../middleware/authMiddleware');

// // ============================================================
// // PUBLIC — Donasi dari viewer
// // ============================================================
// router.post('/create-invoice', midtransCtrl.createDonation);

// // ============================================================
// // WEBHOOK MIDTRANS SNAP
// // Daftarkan URL ini di: Midtrans Dashboard → Settings → Configuration
// //   → Payment Notification URL → https://yourdomain.com/api/midtrans/webhooks
// // ============================================================
// router.post('/webhooks', midtransCtrl.handleWebhook);

// // ============================================================
// // PROTECTED — Streamer yang sudah login
// // ============================================================
// router.post('/withdraw', authMiddleware, midtransCtrl.requestWithdrawal);
// router.get('/withdraw/history', authMiddleware, midtransCtrl.getWithdrawalHistory);

// // ============================================================
// // ADMIN — Kelola request withdrawal manual
// // GET  /api/midtrans/admin/withdrawals          → list semua PENDING
// // PUT  /api/midtrans/admin/withdrawals/:id      → update status (COMPLETED/FAILED)
// // ============================================================
// router.get('/admin/withdrawals', authMiddleware, midtransCtrl.adminGetPendingWithdrawals);
// router.put('/admin/withdrawals/:id', authMiddleware, midtransCtrl.adminUpdateWithdrawal);

// module.exports = router;


// routers/midtransRouter.js — tidak ada perubahan dari versi MySQL
const express = require('express');
const router = express.Router();
const midtransCtrl = require('../controllers/midtransController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-invoice', midtransCtrl.createDonation);
router.post('/webhooks',       midtransCtrl.handleWebhook);

router.post('/withdraw',         authMiddleware, midtransCtrl.requestWithdrawal);
router.get('/withdraw/history',  authMiddleware, midtransCtrl.getWithdrawalHistory);

router.get('/admin/withdrawals',      authMiddleware, midtransCtrl.adminGetPendingWithdrawals);
router.put('/admin/withdrawals/:id',  authMiddleware, midtransCtrl.adminUpdateWithdrawal);

module.exports = router;