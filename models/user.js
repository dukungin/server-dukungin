// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid'],
    },
    password: {
      type: String,
      required: true,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    overlayToken: {
      type: String,
      unique: true,
    },
    role: {
      type: String,
      enum: ['user', 'superAdmin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// ─── Hash password sebelum disimpan ───────────────────────────────────────────
userSchema.pre('save', async function () {
  // Hanya hash jika field password berubah
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Method validasi password ─────────────────────────────────────────────────
userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);