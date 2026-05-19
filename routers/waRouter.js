const express = require('express');
const router = express.Router();
const { getIsReady, getQRCode, initWhatsApp, getSendStats } = require('../config/whatsapp');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');

// GET /wa/status — cek apakah WA sudah login
router.get('/status', (req, res) => {
  res.json({
    success: true,
    isReady: getIsReady(),
    hasQR: !!getQRCode(),
    stats: getSendStats()
  });
});

// GET /wa/qr — ambil QR code (hanya superAdmin)
router.get('/qr', adminMiddleware, async (req, res) => {
  const qr = getQRCode();
  if (!qr) {
    return res.json({ 
      success: false, 
      message: getIsReady() ? 'WhatsApp sudah login' : 'QR belum tersedia, tunggu sebentar' 
    });
  }

  try {
    const qrImage = await qrcode.toDataURL(qr);
    res.json({ success: true, qrImage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /wa/reconnect — reconnect (hanya admin)
router.post('/reconnect', adminMiddleware, async (req, res) => {
  try {
    if (getIsReady()) {
      return res.json({ success: true, message: 'WA sudah terhubung' });
    }

    initWhatsApp();
    
    res.json({ 
      success: true, 
      message: 'Mencoba reconnect dengan session lama...' 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /wa/send-stats — lihat statistik pesan
router.get('/send-stats', superAdminMiddleware, (req, res) => {
  res.json({ success: true, stats: getSendStats() });
});

module.exports = router;