// routers/authRouter.js — tidak ada perubahan dari versi MySQL
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/register',         authCtrl.register);
router.post('/login',            authCtrl.login);
router.post('/verify-pin',       authCtrl.verifyPin);
router.post('/resend-pin',       authCtrl.resendPin);
router.post('/forgot-password',  authCtrl.requestResetPassword);
router.post('/reset-password',   authCtrl.resetPassword);

module.exports = router;