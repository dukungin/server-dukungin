// controllers/donationController.js
const { Donation } = require('../models');

// ============================================================
// GET DONATION HISTORY — untuk streamer yang sedang login
// Menampilkan semua donasi yang masuk ke akun streamer tersebut
// ============================================================
exports.getDonationHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Query params opsional untuk filter & pagination
    const {
      page = 1,
      limit = 50,
      status,       // filter: 'PAID' | 'PENDING' | 'EXPIRED'
      startDate,    // filter: tanggal mulai (ISO string)
      endDate,      // filter: tanggal akhir (ISO string)
    } = req.query;

    const query = { userId };

    // Filter status
    if (status && ['PAID', 'PENDING', 'EXPIRED'].includes(status)) {
      query.status = status;
    }

    // Filter rentang tanggal
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .sort({ createdAt: -1 })          // terbaru duluan
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Donation.countDocuments(query),
    ]);

    // Hitung total nominal PAID
    const totalPaid = await Donation.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId), status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      donations,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalPaid: totalPaid[0]?.total || 0,
        totalCount: total,
      },
    });
  } catch (err) {
    console.error('[getDonationHistory] Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// ============================================================
// GET DONATION STATS — ringkasan statistik donasi streamer
// ============================================================
exports.getDonationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const mongoose = require('mongoose');
    const userObjectId = mongoose.Types.ObjectId(userId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allTime, today, thisMonth, topDonors] = await Promise.all([
      // Total semua waktu
      Donation.aggregate([
        { $match: { userId: userObjectId, status: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // Total hari ini
      Donation.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: 'PAID',
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // Total bulan ini
      Donation.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: 'PAID',
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // Top 5 donor (non-anonim)
      Donation.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: 'PAID',
            donorName: { $ne: 'Anonim' },
          },
        },
        {
          $group: {
            _id: '$donorName',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      allTime: {
        total: allTime[0]?.total || 0,
        count: allTime[0]?.count || 0,
      },
      today: {
        total: today[0]?.total || 0,
        count: today[0]?.count || 0,
      },
      thisMonth: {
        total: thisMonth[0]?.total || 0,
        count: thisMonth[0]?.count || 0,
      },
      topDonors: topDonors.map((d) => ({
        name: d._id,
        totalAmount: d.totalAmount,
        count: d.count,
      })),
    });
  } catch (err) {
    console.error('[getDonationStats] Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};