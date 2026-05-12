const express = require('express');
const router = express.Router();
const testAlertCtrl = require('../controllers/testAlertController');
const authMiddleware = require('../middleware/authMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');

// Hanya Super Admin yang boleh kirim test alert
router.post('/send', authMiddleware, superAdminMiddleware, testAlertCtrl.sendInstantTestAlert);

module.exports = router;