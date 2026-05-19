const express = require('express');
const router = express.Router();
const qrcode = require('qrcode');
const { 
  getIsReady, 
  getQRCode, 
  initWhatsApp, 
  getSendStats,
  incrementSendCount,
  canSendMessage
} = require('../config/whatsapp');

// ==================== PUBLIC ====================
// GET /wa/status — siapa saja bisa lihat status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    isReady: getIsReady(),
    hasQR: !!getQRCode(),
    isConnected: getIsReady(),
  });
});

// ==================== SUPER ADMIN ONLY ====================

// POST /wa/reconnect — reconnect
router.post('/reconnect', async (req, res) => {
  try {
    if (getIsReady()) {
      return res.json({ 
        success: true, 
        message: 'WhatsApp sudah terhubung!',
        isReady: true,
      });
    }

    initWhatsApp();
    
    res.json({ 
      success: true, 
      message: 'Mencoba reconnect...',
      isReady: false,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /wa/qr — ambil QR code
router.get('/qr', async (req, res) => {
  try {
    const qr = getQRCode();
    const ready = getIsReady();
    
    if (!qr && !ready) {
      return res.json({ 
        success: false, 
        isReady: false,
        message: 'QR belum tersedia, klik reconnect terlebih dahulu' 
      });
    }

    if (ready) {
      return res.json({ 
        success: false, 
        isReady: true,
        message: 'WhatsApp sudah terhubung!' 
      });
    }

    const qrImage = await qrcode.toDataURL(qr);
    res.json({ success: true, qrImage, isReady: false });
    
  } catch (err) {
    console.error('[WA QR] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /wa/send-stats
router.get('/send-stats', (req, res) => {
  const stats = getSendStats();
  res.json({ 
    success: true, 
    stats: {
      ...stats,
      canSend: canSendMessage(),
    }
  });
});

// POST /wa/test-send — test kirim pesan
router.post('/test-send', async (req, res) => {
  try {
    const { message } = req.body;
    const client = require('../config/whatsapp').getClient();
    
    if (!client || !getIsReady()) {
      return res.status(400).json({ success: false, message: 'WhatsApp belum terhubung' });
    }

    if (!canSendMessage()) {
      return res.status(400).json({ success: false, message: 'Kuota pesan hari ini sudah habis' });
    }

    const adminNumber = '089513093406';
    const chatId = `${adminNumber}@c.us`;
    
    await client.sendMessage(chatId, message || '🧪 Test pesan');
    incrementSendCount();
    
    res.json({ success: true, message: 'Pesan terkirim!', stats: getSendStats() });
  } catch (err) {
    console.error('[WA Test] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;