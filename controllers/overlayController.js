// controllers/overlayController.js
const { OverlaySetting, User } = require('../models');
require('dotenv').config();

// ============================================================
// GET SETTINGS (user yang sedang login)
// ============================================================
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();

    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    const overlaySetting = await OverlaySetting.findOne({ userId: user._id }).lean();

    res.json({
      user,
      User: user,
      overlaySetting,
      settings: overlaySetting,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// ============================================================
// UPDATE SETTINGS (upsert)
// ============================================================
exports.updateSettings = async (req, res) => {
  try {
    const allowedFields = [
      'minDonate', 'maxDonate',
      'overlayEnabled',   // ← NEW: toggle on/off overlay
      'customIcon',       // ← NEW: custom icon emoji atau URL
      'showTimestamp',    // ← NEW: tampilkan timestamp di overlay
      'theme', 'primaryColor', 'textColor', 'borderColor',
      'animation', 'maxWidth', 'overlayPosition',
      'baseDuration', 'extraPerAmount', 'extraDuration',
      'durationTiers', 'mediaTriggers',
      'soundUrl', 'customCss',
      'highlightColor',
      'soundTiers',
      'leaderboardShowAmount', 
      'quickAmounts',
      'leaderboardLimit', 
      'leaderboardPeriod',

    ];

    console.log('[updateSettings] body:', JSON.stringify(req.body, null, 2));

    const updateData = {};
    allowedFields.forEach(key => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    });

    const setting = await OverlaySetting.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: false }
    );

    try {
      const io = req.app.get('socketio');
      const user = await User.findById(req.user.id).lean();
      if (io && user?.overlayToken) {
        io.to(user.overlayToken).emit('settings-updated', setting);
      }
    } catch (e) {}

    res.json({ message: 'Settings updated successfully', data: setting });
  } catch (err) {
    console.error('[updateSettings] Error:', err);
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

// ============================================================
// GET PUBLIC PROFILE — untuk halaman donasi (berdasarkan username)
// ============================================================
// controllers/overlayController.js - VERSI SUPER OPTIMIZED
exports.getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    // ✅ 1 MONGO AGGREGATE QUERY - SUPER CEPAT!
    const [result] = await User.aggregate([
      // 1. Match user
      { $match: { username } },
      
      // 2. Project fields
      {
        $project: {
          username: 1,
          fullName: 1,
          bio: { $ifNull: ['$bio', ''] },
          instagram: { $ifNull: ['$instagram', ''] },
          facebook: { $ifNull: ['$facebook', ''] },
          youtube: { $ifNull: ['$youtube', ''] },
          twitter: { $ifNull: ['$twitter', ''] },
          totalDonations: { $ifNull: ['$totalDonations', 0] },
          totalDonationCount: { $ifNull: ['$totalDonationCount', 0] },
          donationMilestones: { $ifNull: ['$donationMilestones', {}] },
          _id: 1
        }
      },
      
      // 3. Followers count (LEFT JOIN)
      {
        $lookup: {
          from: 'follows',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { 
              $expr: { $eq: ['$followingId', '$$userId'] } 
            }},
            { $count: 'followersCount' }
          ],
          as: 'followersData'
        }
      },
      
      // 4. Following count
      {
        $lookup: {
          from: 'follows', 
          let: { userId: '$_id' },
          pipeline: [
            { $match: { 
              $expr: { $eq: ['$followerId', '$$userId'] } 
            }},
            { $count: 'followingCount' }
          ],
          as: 'followingData'
        }
      },
      
      // 5. Supporters (donations)
      {
        $lookup: {
          from: 'donations',
          let: { username: '$username' },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ['$streamerUsername', '$$username'] },
                  { $eq: ['$status', 'PAID'] }
                ]
              }
            }},
            { $count: 'supportersCount' }
          ],
          as: 'supportersData'
        }
      },
      
      // 6. Overlay settings
      {
        $lookup: {
          from: 'overlaySettings',
          localField: '_id',
          foreignField: 'userId',
          as: 'overlaySetting'
        }
      },
      
      // 7. Flatten arrays
      {
        $addFields: {
          followersCount: { $ifNull: [{ $arrayElemAt: ['$followersData.followersCount', 0] }, 0] },
          followingCount: { $ifNull: [{ $arrayElemAt: ['$followingData.followingCount', 0] }, 0] },
          supportersCount: { $ifNull: [{ $arrayElemAt: ['$supportersData.supportersCount', 0] }, 0] },
          overlaySetting: { $arrayElemAt: ['$overlaySetting', 0] }
        }
      },
      
      // 8. Final projection
      {
        $project: {
          username: 1,
          fullName: 1,
          bio: 1,
          instagram: 1,
          facebook: 1,
          youtube: 1,
          twitter: 1,
          followersCount: 1,
          followingCount: 1,
          supportersCount: 1,
          totalDonations: 1,
          totalDonationCount: 1,
          donationMilestones: 1,
          overlaySetting: 1
        }
      }
    ]);

    if (!result.length) {
      return res.status(404).json({ message: 'Streamer tidak ditemukan' });
    }

    res.json({
      ...result[0],
      OverlaySetting: result[0].overlaySetting // Kompatibilitas
    });

  } catch (err) {
    console.error('❌ getPublicProfile aggregate error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================================
// GET OVERLAY SETTINGS — untuk OBS (berdasarkan overlayToken)
// ============================================================
exports.getOverlaySettings = async (req, res) => {
  try {
    const user = await User.findOne({ overlayToken: req.params.token }).lean();

    if (!user) return res.status(404).json({ message: 'Token tidak valid' });

    const overlaySetting = await OverlaySetting.findOne({ userId: user._id }).lean();
    res.json(overlaySetting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};