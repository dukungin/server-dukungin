// controllers/overlayController.js
const { OverlaySetting, User } = require('../models');
require('dotenv').config();

// ============================================================
// GET SETTINGS (user yang sedang login)
// ============================================================
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();

    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    const overlaySetting = await OverlaySetting.findOne({ userId: user._id }).lean();

    res.json({
      user,
      User: user,
      overlaySetting,
      settings: overlaySetting,
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
    const setting = await OverlaySetting.findOneAndUpdate(
      { userId: req.user.id },
      { ...req.body, userId: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ message: 'Settings updated successfully', data: setting });
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

// ============================================================
// GET PUBLIC PROFILE — untuk halaman donasi (berdasarkan username)
// Response menyertakan overlaySetting (key konsisten untuk SupporterPage)
// ============================================================
exports.getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne(
      { username: req.params.username },
      'username _id'   // jangan kirim field sensitif
    ).lean();

    if (!user) return res.status(404).json({ message: 'Streamer tidak ditemukan' });

    const overlaySetting = await OverlaySetting.findOne({ userId: user._id }).lean();

    // Sertakan keduanya: overlaySetting (camelCase baru) & OverlaySetting (PascalCase lama)
    // agar backward compat dengan kode lama yang mungkin masih pakai OverlaySetting
    res.json({
      ...user,
      overlaySetting,
      OverlaySetting: overlaySetting,
    });
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