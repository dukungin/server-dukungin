const { Suggestion } = require('../models');
const mongoose = require('mongoose');

// GET /api/suggestions - get all suggestions (for superAdmin)
exports.getAllSuggestions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    
    if (status && ['new', 'reviewed', 'planned', 'implemented', 'rejected'].includes(status)) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [suggestions, total] = await Promise.all([
      Suggestion.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Suggestion.countDocuments(query),
    ]);

    res.json({
      suggestions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[getAllSuggestions] Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/suggestions/my - get my suggestions
exports.getMySuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const suggestions = await Suggestion.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ suggestions });
  } catch (err) {
    console.error('[getMySuggestions] Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/suggestions - create new suggestion
exports.createSuggestion = async (req, res) => {
  try {
    const { category, title, message } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Judul wajib diisi' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Pesan wajib diisi' });
    }
    if (title.length > 200) {
      return res.status(400).json({ message: 'Judul maksimal 200 karakter' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ message: 'Pesan maksimal 2000 karakter' });
    }

    const suggestion = await Suggestion.create({
      userId: new mongoose.Types.ObjectId(userId),
      username: req.user.username,
      category: category || 'other',
      title: title.trim(),
      message: message.trim(),
    });

    res.status(201).json({
      message: 'Saran berhasil dikirim! Terima kasih atas masukanmu.',
      suggestion,
    });
  } catch (err) {
    console.error('[createSuggestion] Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// PUT /api/suggestions/:id - update suggestion status (admin only)
exports.updateSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ message: 'Saran tidak ditemukan' });
    }

    if (status && ['new', 'reviewed', 'planned', 'implemented', 'rejected'].includes(status)) {
      suggestion.status = status;
    }
    if (adminNote !== undefined) {
      suggestion.adminNote = adminNote;
    }
    suggestion.reviewedBy = new mongoose.Types.ObjectId(req.user.id);

    await suggestion.save();

    res.json({
      message: 'Saran berhasil diupdate',
      suggestion,
    });
  } catch (err) {
    console.error('[updateSuggestion] Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};