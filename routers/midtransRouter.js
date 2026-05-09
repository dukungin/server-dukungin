// routers/midtransRouter.js — tidak ada perubahan dari versi MySQL
const express = require('express');
const router = express.Router();
const midtransCtrl = require('../controllers/midtransController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.post('/create-invoice', midtransCtrl.createDonation);
router.post('/webhooks',       midtransCtrl.handleWebhook);

router.post('/withdraw',         authMiddleware, midtransCtrl.requestWithdrawal);
router.get('/withdraw/history',  authMiddleware, midtransCtrl.getWithdrawalHistory);

router.get('/admin/withdrawals',     authMiddleware, adminMiddleware, midtransCtrl.adminGetPendingWithdrawals);
router.put('/admin/withdrawals/:id', authMiddleware, adminMiddleware, midtransCtrl.adminUpdateWithdrawal);

router.post('/test-socket', authMiddleware, async (req, res) => {
  const io = req.app.get('socketio');
  const user = await require('../models').User.findById(req.user.id);
  
  io.to(user.overlayToken).emit('new-donation', {
    donorName: req.body.donorName || 'Test Donor',
    amount: req.body.amount || 50000,
    message: req.body.message || 'Test donasi!',
    mediaUrl: req.body.mediaUrl || null,
    mediaType: req.body.mediaType || 'image',
  });
  
  res.json({ message: 'Socket test sent!', room: user.overlayToken });
});

module.exports = router;