// const mongoose = require('mongoose');

// // models/overlaySetting.js
// const overlaySettingSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       unique: true,
//     },
//     minDonate: { type: Number, default: 10000 },
//     maxDonate: { type: Number, default: 10000000 },
//     theme: { type: String, default: 'modern' },           // ← ganti overlayTheme
//     primaryColor: { type: String, default: '#6366f1' },   // ← ganti backgroundColor
//     textColor: { type: String, default: '#ffffff' },
//     animation: { type: String, default: 'bounce' },       // ← ganti animationType
//     baseDuration: { type: Number, default: 5 },           // ← ganti duration
//     extraPerAmount: { type: Number, default: 10000 },     // ← tambah
//     extraDuration: { type: Number, default: 1 },          // ← tambah
//     soundUrl: String,
//     customCss: String,
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('OverlaySetting', overlaySettingSchema);


const mongoose = require('mongoose');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

// Ketentuan durasi berdasarkan nominal donasi
const durationTierSchema = new mongoose.Schema(
  {
    minAmount:   { type: Number, required: true },   // batas bawah nominal (inklusif)
    maxAmount:   { type: Number, default: null },     // batas atas nominal (null = tak terbatas)
    duration:    { type: Number, required: true },    // durasi tampil dalam detik
  },
  { _id: false }
);

// Media (gambar/video) yang muncul saat nominal >= minAmount
const mediaTriggerSchema = new mongoose.Schema(
  {
    minAmount:   { type: Number, required: true },   // minimal donasi agar media ini muncul
    mediaUrl:    { type: String, required: true },   // URL gambar atau video
    mediaType:   { type: String, enum: ['image', 'video'], default: 'image' },
    label:       { type: String, default: '' },      // label deskriptif, contoh "Sultan Alert"
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const overlaySettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // ── Donasi ──────────────────────────────────────────────────────────────
    minDonate:      { type: Number, default: 10000 },
    maxDonate:      { type: Number, default: 10000000 },

    // ── Tampilan alert ──────────────────────────────────────────────────────
    theme:          { type: String, default: 'modern' },
    primaryColor:   { type: String, default: '#6366f1' },
    textColor:      { type: String, default: '#ffffff' },
    animation:      { type: String, default: 'bounce' },
    maxWidth:       { type: Number, default: 280 },
    overlayPosition:{ type: String, default: 'bottom-right' },

    // ── Durasi (legacy — tetap ada untuk backward compat) ───────────────────
    baseDuration:   { type: Number, default: 5 },
    extraPerAmount: { type: Number, default: 10000 },
    extraDuration:  { type: Number, default: 1 },

    // ── Durasi bertingkat (prioritas lebih tinggi dari legacy jika diisi) ───
    // Contoh: [{ minAmount:0, maxAmount:4999, duration:5 },
    //           { minAmount:5000, maxAmount:49999, duration:10 },
    //           { minAmount:50000, maxAmount:null, duration:20 }]
    durationTiers:  { type: [durationTierSchema], default: [] },

    // ── Media trigger ───────────────────────────────────────────────────────
    // Contoh: [{ minAmount:50000, mediaUrl:'https://...', mediaType:'image', label:'Sultan' }]
    mediaTriggers:  { type: [mediaTriggerSchema], default: [] },

    // ── Misc ────────────────────────────────────────────────────────────────
    soundUrl:       String,
    customCss:      String,
  },
  { timestamps: true }
);

// ─── Helper: hitung durasi berdasarkan amount ─────────────────────────────────
// Bisa dipakai di overlay page maupun controller
overlaySettingSchema.methods.getDuration = function (amount) {
  // Gunakan durationTiers jika ada
  if (this.durationTiers && this.durationTiers.length > 0) {
    // Urutkan dari maxAmount terbesar ke terkecil agar match tier tertinggi duluan
    const sorted = [...this.durationTiers].sort(
      (a, b) => (b.minAmount ?? 0) - (a.minAmount ?? 0)
    );
    for (const tier of sorted) {
      if (
        amount >= tier.minAmount &&
        (tier.maxAmount === null || amount <= tier.maxAmount)
      ) {
        return tier.duration;
      }
    }
  }
  // Fallback ke kalkulasi legacy
  const extras = Math.floor(amount / this.extraPerAmount);
  return this.baseDuration + extras * this.extraDuration;
};

// ─── Helper: cari media yang cocok untuk amount ───────────────────────────────
overlaySettingSchema.methods.getMediaForAmount = function (amount) {
  if (!this.mediaTriggers || this.mediaTriggers.length === 0) return null;
  // Ambil trigger dengan minAmount tertinggi yang masih <= amount
  const eligible = this.mediaTriggers
    .filter(t => amount >= t.minAmount)
    .sort((a, b) => b.minAmount - a.minAmount);
  return eligible[0] || null;
};

module.exports = mongoose.model('OverlaySetting', overlaySettingSchema);