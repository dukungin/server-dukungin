const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['feature', 'bug', 'improvement', 'other'],
    default: 'other',
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'planned', 'implemented', 'rejected'],
    default: 'new',
  },
  adminNote: {
    type: String,
    default: '',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true });

suggestionSchema.index({ userId: 1, createdAt: -1 });
suggestionSchema.index({ status: 1 });

module.exports = mongoose.model('Suggestion', suggestionSchema);