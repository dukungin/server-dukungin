module.exports = (req, res, next) => {
  if (req.user?.role !== 'superAdmin') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  next();
};