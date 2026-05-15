const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Buat folder uploads jika belum ada
const uploadsDir = path.join(__dirname, '..', 'uploads', 'audio');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads/audio directory');
}

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  }
});

const audioFilter = (req, file, cb) => {
  // ✅ Support lebih banyak format
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file audio (.mp3, .wav, .ogg, .m4a)!'), false);
  }
};

const audioUpload = multer({ 
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

module.exports = {
  audioUpload
};