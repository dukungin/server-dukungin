// const { OverlaySetting, User } = require('../models');

// exports.getSettings = async (req, res) => {
//   try {
//     const settings = await OverlaySetting.findOne({ where: { userId: req.user.id } });
//     res.json(settings);
//   } catch (err) {
//     res.status(500).json({ message: "Server Error", error: err.message });
//   }
// };

// exports.updateSettings = async (req, res) => {
//   try {
//     const [setting, created] = await OverlaySetting.upsert({
//       ...req.body,
//       userId: req.user.id
//     });
//     res.json({ message: "Settings updated successfully", data: setting });
//   } catch (err) {
//     res.status(400).json({ message: "Update failed" });
//   }
// };

// // Mengambil profil streamer untuk Halaman Donasi (berdasarkan username)
// exports.getPublicProfile = async (req, res) => {
//   try {
//     const user = await User.findOne({ 
//       where: { username: req.params.username },
//       attributes: ['id', 'username'], // Jangan kirim email/password!
//       include: [{ model: OverlaySetting }]
//     });
    
//     if (!user) return res.status(404).json({ message: "Streamer tidak ditemukan" });
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Mengambil setting untuk OBS (berdasarkan overlayToken)
// exports.getOverlaySettings = async (req, res) => {
//   try {
//     const user = await User.findOne({ 
//       where: { overlayToken: req.params.token },
//       include: [{ model: OverlaySetting }]
//     });
    
//     if (!user) return res.status(404).json({ message: "Token tidak valid" });
//     res.json(user.OverlaySetting);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


// controllers/overlayController.js
const { OverlaySetting, User } = require('../models');
require('dotenv').config();

// ============================================================
// GET SETTINGS (user yang sedang login)
// ============================================================
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    const overlaySetting = await OverlaySetting.findOne({ userId: user._id }).lean();

    res.json({
      user,
      overlaySetting,
      settings: overlaySetting
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// ============================================================
// UPDATE SETTINGS (upsert)
// ============================================================
exports.updateSettings = async (req, res) => {
  try {
    // findOneAndUpdate dengan upsert menggantikan Sequelize .upsert()
    const setting = await OverlaySetting.findOneAndUpdate(
      { userId: req.user.id },
      { ...req.body, userId: req.user.id },
      {
        new: true,      // kembalikan dokumen setelah update
        upsert: true,   // buat jika belum ada
        runValidators: true,
      }
    );
    res.json({ message: 'Settings updated successfully', data: setting });
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

// ============================================================
// GET PUBLIC PROFILE — untuk halaman donasi (berdasarkan username)
// ============================================================
exports.getPublicProfile = async (req, res) => {
  try {
    // Cari user, jangan kirim field sensitif
    const user = await User.findOne(
      { username: req.params.username },
      'username _id'  // hanya field ini yang dikembalikan (setara attributes di Sequelize)
    ).lean();

    if (!user) return res.status(404).json({ message: 'Streamer tidak ditemukan' });

    // Ambil overlay setting terpisah, lalu gabungkan ke response
    const overlaySetting = await OverlaySetting.findOne({ userId: user._id }).lean();

    res.json({ ...user, OverlaySetting: overlaySetting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// GET OVERLAY SETTINGS — untuk OBS (berdasarkan overlayToken)
// ============================================================
exports.getOverlaySettings = async (req, res) => {
  try {
    const user = await User.findOne({ overlayToken: req.params.token }).lean();

    if (!user) return res.status(404).json({ message: 'Token tidak valid' });

    const overlaySetting = await OverlaySetting.findOne({ userId: user._id }).lean();
    res.json(overlaySetting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};