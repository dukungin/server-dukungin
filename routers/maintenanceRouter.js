const express = require('express');
const router = express.Router();
const Maintenance = require('../models');
const auth = require('../middleware/authMiddleware');

// GET settings
router.get('/settings', auth, async (req, res) => {
  try {
    let settings = await Maintenance.findOne().lean();
    if (!settings) {
      settings = await Maintenance.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE settings (Hanya Super Admin)
router.put('/settings', auth, async (req, res) => {
  try {
    const { auth, supporter, withdrawal, dashboard } = req.body;

    let settings = await Maintenance.findOne();
    if (!settings) {
      settings = new Maintenance();
    }

    settings.auth = auth ?? settings.auth;
    settings.supporter = supporter ?? settings.supporter;
    settings.withdrawal = withdrawal ?? settings.withdrawal;
    settings.dashboard = dashboard ?? settings.dashboard;
    settings.updatedBy = req.user.id;

    await settings.save();

    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;