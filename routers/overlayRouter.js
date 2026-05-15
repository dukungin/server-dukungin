// routers/overlayRouter.js — tidak ada perubahan dari versi MySQL
const express = require('express');
const router = express.Router();
const overlayCtrl = require('../controllers/overlayController');
const authMiddleware = require('../middleware/authMiddleware');
const { audioUpload } = require('../middleware/multerConfig');

router.get('/settings',         authMiddleware, overlayCtrl.getSettings);      // ← bukan getOverlaySettings
router.put('/settings',         authMiddleware, overlayCtrl.updateSettings);   // ← ganti POST ke PUT
router.get('/public/:username', overlayCtrl.getPublicProfile);
router.get('/config/:token',    overlayCtrl.getOverlaySettings);
// ✅ Upload audio publik
router.post('/upload-audio', authMiddleware, audioUpload.single('audio'), overlayCtrl.uploadPublicSound);

// ✅ Proxy audio (bypass CORS)
router.get('/proxy-audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'Missing URL parameter' });
    }

    console.log('🔄 Proxying audio:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DukunginAudioProxy/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    
    res.set({
      'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': buffer.byteLength,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('❌ Audio proxy failed:', err.message);
    res.status(500).json({ 
      message: 'Failed to proxy audio', 
      error: err.message 
    });
  }
});


module.exports = router;