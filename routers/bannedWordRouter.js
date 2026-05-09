const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bannedWordController');
const auth = require('../middleware/authMiddleware');

router.get('/',  auth, ctrl.get);
router.put('/',  auth, ctrl.save);

module.exports = router;