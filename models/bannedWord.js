const mongoose = require('mongoose');
const bannedWordSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  words:   { type: [String], default: [] }, // lowercase
}, { timestamps: true });
bannedWordSchema.index({ userId: 1 }, { unique: true });
module.exports = mongoose.model('BannedWord', bannedWordSchema);