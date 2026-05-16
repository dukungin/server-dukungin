// middleware/imageUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Pastikan folder uploads/images ada
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Folder public/uploads/images/ berhasil dibuat');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (jpg, png, webp, gif) yang diperbolehkan!'), false);
  }
};

const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,   // ← MAKSIMAL 3MB
    files: 1
  }
});

module.exports = uploadImage;