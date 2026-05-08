// routers/authRouter.js — tidak ada perubahan dari versi MySQL
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/register',         authCtrl.register);
router.post('/login',            authCtrl.login);

module.exports = router;