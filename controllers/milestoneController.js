const { Milestone, Donation } = require('../models');

exports.getMilestones = async (req, res) => {
  const milestones = await Milestone.find({ userId: req.user.id }).sort('order');
  res.json(milestones);
};

exports.upsertMilestones = async (req, res) => {
  const { milestones } = req.body; // array
  try {
    await Milestone.deleteMany({ userId: req.user.id });
    const docs = milestones.map((m, i) => ({ ...m, userId: req.user.id, order: i }));
    const created = await Milestone.insertMany(docs);
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Public: untuk widget embed (leaderboard + milestones)
exports.getPublicMilestones = async (req, res) => {
  const { User } = require('../models');
  const user = await User.findOne({ username: req.params.username }).lean();
  if (!user) return res.status(404).json({ message: 'Not found' });
  const milestones = await Milestone.find({ userId: user._id }).sort('order').lean();
  // Hitung progress dari total donasi PAID
  const result = await Donation.aggregate([
    { $match: { userId: user._id, status: 'PAID' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalPaid = result[0]?.total || 0;
  const enriched = milestones.map(m => ({
    ...m,
    currentAmount: Math.min(totalPaid, m.targetAmount),
    progress: Math.min(100, Math.round((totalPaid / m.targetAmount) * 100)),
    reached: totalPaid >= m.targetAmount,
  }));
  res.json({ milestones: enriched, totalPaid });
};