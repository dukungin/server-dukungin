const mongoose = require('mongoose');

// models/overlaySetting.js
const overlaySettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    minDonate: { type: Number, default: 10000 },
    maxDonate: { type: Number, default: 10000000 },
    theme: { type: String, default: 'modern' },           // ← ganti overlayTheme
    primaryColor: { type: String, default: '#6366f1' },   // ← ganti backgroundColor
    textColor: { type: String, default: '#ffffff' },
    animation: { type: String, default: 'bounce' },       // ← ganti animationType
    baseDuration: { type: Number, default: 5 },           // ← ganti duration
    extraPerAmount: { type: Number, default: 10000 },     // ← tambah
    extraDuration: { type: Number, default: 1 },          // ← tambah
    soundUrl: String,
    customCss: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('OverlaySetting', overlaySettingSchema);