// routers/authRouter.js — versi lengkap dengan fitur PIN & reset password
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadImage = require('../middleware/imageUpload');

// ── Auth Dasar ─────────────────────────────────────────────
router.post('/register',          authCtrl.register);
router.post('/login',             authCtrl.login);

// ── Verifikasi Email via PIN ───────────────────────────────
router.post('/verify-pin',        authCtrl.verifyPin);
router.post('/resend-pin',        authCtrl.resendPin);

// ── Forgot & Reset Password ────────────────────────────────
router.post('/forgot-password',   authCtrl.forgotPassword);
router.post('/reset-password',    authCtrl.resetPassword);

// ── Profile (butuh auth) ───────────────────────────────────
router.get('/profile',            authMiddleware, authCtrl.getProfile);
router.put('/profile',            authMiddleware, authCtrl.updateProfile);
router.put('/change-password',    authMiddleware, authCtrl.changePassword);

router.post('/upload-profile-picture', 
  authMiddleware, 
  uploadImage.single('image'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diupload' });
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/images/${req.file.filename}`;

      // Update profile picture di database
      await User.findByIdAndUpdate(req.user.id, { 
        profilePicture: imageUrl 
      });

      res.json({
        success: true,
        url: imageUrl,
        message: 'Foto profil berhasil diupload'
      });

    } catch (err) {
      console.error('Upload Profile Picture Error:', err);
      res.status(500).json({ 
        message: 'Gagal mengupload foto profil', 
        error: err.message 
      });
    }
  }
);

module.exports = router;