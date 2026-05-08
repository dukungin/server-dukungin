const mongoose = require('mongoose');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

// Ketentuan durasi berdasarkan nominal donasi
const durationTierSchema = new mongoose.Schema(
  {
    minAmount: { type: Number, required: true }, // batas bawah nominal (inklusif)
    maxAmount: { type: Number, default: null },  // batas atas nominal (null = tak terbatas)
    duration:  { type: Number, required: true }, // durasi tampil dalam detik
  },
  { _id: false }
);

// ─── Media Trigger Schema (SIMPLIFIED) ───────────────────────────────────────
//
// Streamer hanya menentukan:
//   1. minAmount  → minimal donasi agar input media muncul di halaman donor
//   2. mediaType  → tipe media yang diizinkan donor untuk kirim
//                   'image'  → hanya input gambar (jpg, gif, png, webp)
//                   'video'  → hanya input video (mp4, webm, mov)
//                   'both'   → donor bisa pilih gambar atau video
//   3. label      → nama/label trigger, contoh "Sultan Alert", tampil di SupporterPage
//
// URL media TIDAK diisi streamer — diisi oleh donor di SupporterPage saat donasi.
// URL media dari donor disimpan di model Donation (bukan OverlaySetting).
//
const mediaTriggerSchema = new mongoose.Schema(
  {
    minAmount: { type: Number, required: true },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'both'],
      default: 'both',
    },
    label: { type: String, default: '' }, // contoh: "Sultan Alert", "Boss Alert"
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const overlaySettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // ── Donasi ──────────────────────────────────────────────────────────────
    minDonate: { type: Number, default: 10000 },
    maxDonate: { type: Number, default: 10000000 },

    // ── Tampilan alert ──────────────────────────────────────────────────────
    theme:           { type: String, default: 'modern' },
    primaryColor:    { type: String, default: '#6366f1' },
    textColor:       { type: String, default: '#ffffff' },
    animation:       { type: String, default: 'bounce' },
    maxWidth:        { type: Number, default: 280 },
    overlayPosition: { type: String, default: 'bottom-right' },

    // ── Durasi (legacy — tetap ada untuk backward compat) ───────────────────
    baseDuration:   { type: Number, default: 5 },
    extraPerAmount: { type: Number, default: 10000 },
    extraDuration:  { type: Number, default: 1 },

    // ── Durasi bertingkat ───────────────────────────────────────────────────
    // Contoh: [{ minAmount:0, maxAmount:4999, duration:5 },
    //           { minAmount:5000, maxAmount:49999, duration:10 },
    //           { minAmount:50000, maxAmount:null, duration:20 }]
    durationTiers: { type: [durationTierSchema], default: [] },

    // ── Media Triggers (SIMPLIFIED) ─────────────────────────────────────────
    // Streamer hanya set: nominal minimum + tipe media yang diizinkan + label.
    // TIDAK ada mediaUrl di sini — URL diisi oleh donor saat donasi.
    //
    // Contoh:
    // [
    //   { minAmount: 50000,  mediaType: 'image', label: 'Fan Art Alert' },
    //   { minAmount: 100000, mediaType: 'both',  label: 'Sultan Alert'  },
    // ]
    mediaTriggers: { type: [mediaTriggerSchema], default: [] },

    // ── Misc ────────────────────────────────────────────────────────────────
    soundUrl:  String,
    customCss: String,
  },
  { timestamps: true }
);

// ─── Instance Method: hitung durasi berdasarkan amount ────────────────────────
overlaySettingSchema.methods.getDuration = function (amount) {
  if (this.durationTiers && this.durationTiers.length > 0) {
    const sorted = [...this.durationTiers].sort((a, b) => b.minAmount - a.minAmount);
    for (const tier of sorted) {
      if (
        amount >= tier.minAmount &&
        (tier.maxAmount === null || amount <= tier.maxAmount)
      ) {
        return tier.duration;
      }
    }
  }
  const extras = Math.floor(amount / this.extraPerAmount);
  return this.baseDuration + extras * this.extraDuration;
};

// ─── Instance Method: cari trigger media aktif untuk amount ──────────────────
// Mengembalikan trigger dengan minAmount tertinggi yang masih <= amount.
// Hasilnya digunakan untuk menentukan input apa yang muncul di SupporterPage.
overlaySettingSchema.methods.getMediaTriggerForAmount = function (amount) {
  if (!this.mediaTriggers || this.mediaTriggers.length === 0) return null;
  const eligible = this.mediaTriggers
    .filter((t) => amount >= t.minAmount)
    .sort((a, b) => b.minAmount - a.minAmount);
  return eligible[0] || null;
};

module.exports = mongoose.model('OverlaySetting', overlaySettingSchema);