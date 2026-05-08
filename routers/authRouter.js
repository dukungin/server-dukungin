// routers/authRouter.js — tidak ada perubahan dari versi MySQL
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register',         authCtrl.register);
router.post('/login',            authCtrl.login);

router.get('/profile',           authMiddleware, authCtrl.getProfile);
router.put('/profile',           authMiddleware, authCtrl.updateProfile);
router.put('/change-password',   authMiddleware, authCtrl.changePassword)
module.exports = router;