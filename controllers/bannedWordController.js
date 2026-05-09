const { BannedWord } = require('../models');

exports.get = async (req, res) => {
  const doc = await BannedWord.findOne({ userId: req.user.id }).lean();
  res.json({ words: doc?.words || [] });
};

exports.save = async (req, res) => {
  const words = (req.body.words || []).map(w => w.toLowerCase().trim()).filter(Boolean);
  const doc = await BannedWord.findOneAndUpdate(
    { userId: req.user.id },
    { words },
    { new: true, upsert: true }
  );
  res.json({ words: doc.words });
};

// Helper: dipakai di donationController saat donor submit pesan
exports.containsBannedWord = async (userId, text) => {
  if (!text) return false;
  const doc = await BannedWord.findOne({ userId }).lean();
  if (!doc?.words?.length) return false;
  const lower = text.toLowerCase();
  return doc.words.some(w => lower.includes(w));
};