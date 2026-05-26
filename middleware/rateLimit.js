// middleware/rateLimit.js
const rateLimitStore = new Map();

/**
 * Rate Limiter dengan kombinasi IP dan Email
 * - Untuk user yang belum login: berbasis hanya pada IP
 * - Untuk user yang sudah login: berbasis pada IP + Email
 */
const createRateLimit = (options = {}) => {
  const {
    windowMs = 60 * 1000,
    maxRequests = 10,
    message = 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
    statusCode = 429,
    useEmail = false // Default: false = hanya IP
  } = options;

  return async (req, res, next) => {
    try {
      const ip = req.ip || 
                 req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                 req.connection?.remoteAddress || 
                 'unknown';

      // Jika useEmail = true DAN user sudah login, gunakan IP + Email
      let identifier = ip;
      if (useEmail && req.user && req.user.email) {
        identifier = `${ip}:${req.user.email}`;
      }

      const record = rateLimitStore.get(identifier) || {
        count: 0,
        startTime: Date.now()
      };

      const now = Date.now();
      if (now - record.startTime > windowMs) {
        record.count = 0;
        record.startTime = now;
      }

      record.count++;
      rateLimitStore.set(identifier, record);

      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
      res.set('X-RateLimit-Reset', Math.ceil((record.startTime + windowMs) / 1000));

      if (record.count > maxRequests) {
        console.log(`[RateLimit] ⚠️ Terlalu banyak permintaan dari ${identifier} (${record.count}/${maxRequests})`);
        
        return res.status(statusCode).json({
          success: false,
          message,
          retryAfter: Math.ceil((record.startTime + windowMs - now) / 1000)
        });
      }

      console.log(`[RateLimit] ✅ ${identifier} - ${record.count}/${maxRequests} request`);
      next();

    } catch (error) {
      console.error('[RateLimit] Error:', error);
      next();
    }
  };
};

// Rate limit untuk yang sudah login (IP + Email)
const rateLimitAuth = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.',
  useEmail: true
});

// Rate limit untuk yang BELUM login (hanya IP)
const rateLimitPublic = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,   // Lebih rendah karena untuk public
  message: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.',
  useEmail: false
});

// Rate limit strict untuk uploads (public)
const rateLimitUpload = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 3,   // Sangat ketat untuk upload
  message: 'Terlalu banyak upload. Coba lagi dalam 1 menit.',
  useEmail: false
});

// Cleanup setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.startTime > 3600000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

module.exports = {
  createRateLimit,
  rateLimitAuth,
  rateLimitPublic,
  rateLimitUpload
};