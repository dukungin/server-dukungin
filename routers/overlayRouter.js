// routers/overlayRouter.js — tidak ada perubahan dari versi MySQL
const express = require('express');
const router = express.Router();
const overlayCtrl = require('../controllers/overlayController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/settings',         authMiddleware, overlayCtrl.getSettings);      // ← bukan getOverlaySettings
router.put('/settings',         authMiddleware, overlayCtrl.updateSettings);   // ← ganti POST ke PUT
router.get('/public/:username', overlayCtrl.getPublicProfile);
router.get('/config/:token',    overlayCtrl.getOverlaySettings);

module.exports = router;