// routers/streamerRouter.js
const express = require('express');
const router = express.Router();
const streamerController = require('../controllers/streamerController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/public', streamerController.getPublicStreamers);

module.exports = router;