// models/Announcement.js
const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'update', 'promo', 'maintenance'],
    default: 'info',
  },
  expiresAt: {
    type: Date,
    default: null, // null = tidak ada masa berlaku
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Track siapa saja yang sudah baca
  readBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now },
    }
  ],
}, { timestamps: true });

// Index untuk query efisien
announcementSchema.index({ isActive: 1, expiresAt: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);