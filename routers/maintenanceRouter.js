const express = require('express');
const router = express.Router();
const { Maintenance } = require('../models');
const auth = require('../middleware/authMiddleware');

// GET settings - Boleh diakses oleh semua user yang login
router.get('/settings', auth, async (req, res) => {
  try {
    let settings = await Maintenance.findOne();
    
    if (!settings) {
      settings = await Maintenance.create({});
    }

    res.json(settings);
  } catch (err) {
    console.error('[Maintenance GET Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE settings - Hanya Super Admin yang boleh
router.put('/settings', auth, async (req, res) => {
  try {
    // Cek apakah user adalah Super Admin
    if (req.user.role !== 'superAdmin') {
      return res.status(403).json({ 
        message: 'Akses ditolak. Hanya Super Admin yang dapat mengubah pengaturan maintenance.' 
      });
    }

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

    res.json({ 
      success: true, 
      message: 'Pengaturan Maintenance berhasil disimpan',
      data: settings 
    });
  } catch (err) {
    console.error('[Maintenance PUT Error]', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;