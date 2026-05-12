const express = require('express');
const router = express.Router();
const testAlertCtrl = require('../controllers/testAlertController');
const authMiddleware = require('../middleware/authMiddleware');

// Hanya Super Admin yang boleh kirim test alert
router.post('/send', authMiddleware, testAlertCtrl.sendInstantTestAlert);

module.exports = router;