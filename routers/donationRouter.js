// routers/donationRouter.js
const express = require('express');
const router = express.Router();
const donationCtrl = require('../controllers/donationController');
const authMiddleware = require('../middleware/authMiddleware');
const { rateLimitAuth } = require('../middleware/rateLimit');

router.get('/history', authMiddleware, rateLimitAuth, donationCtrl.getDonationHistory);
router.get('/stats', authMiddleware, rateLimitAuth, donationCtrl.getDonationStats);
router.get('/my-donations', authMiddleware, rateLimitAuth, donationCtrl.getMyDonations);
router.get('/sent', authMiddleware, rateLimitAuth, donationCtrl.getSentDonations);

module.exports = router;