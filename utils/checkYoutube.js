// utils/checkYoutube.js
require('dotenv').config();
const { google } = require('googleapis');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

const extractVideoId = (url) => {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/shorts\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
    /youtube\.com\/live\/([\w-]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const checkYouTubeVideo = async (url) => {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return { safe: false, reason: 'URL YouTube tidak valid' };
  }

  let video;
  try {
    const res = await youtube.videos.list({
      part: ['contentDetails', 'status', 'snippet'],
      id: [videoId],
    });
    video = res.data.items?.[0];
  } catch (err) {
    console.error('[YouTube API] Error:', err.message);
    throw new Error('YouTube API tidak tersedia'); // ← throw, bukan return safe: false
  }

  // Video tidak ada / private / dihapus
  if (!video) {
    return { safe: false, reason: 'Video tidak ditemukan atau private' };
  }

  const { contentDetails, status, snippet } = video;

  // Video 18+
  if (contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') {
    return { safe: false, reason: 'Video dibatasi usia (18+)' };
  }

  // Tidak bisa di-embed (tidak akan muncul di OBS)
  if (status?.embeddable === false) {
    return { safe: false, reason: 'Video tidak bisa ditampilkan (embed dinonaktifkan)' };
  }

  // Video diblokir di negara tertentu (opsional)
  const regionRestriction = contentDetails?.regionRestriction;
  if (regionRestriction?.blocked?.includes('ID')) {
    return { safe: false, reason: 'Video diblokir di Indonesia' };
  }

  // ← TARUH DI SINI
  const title = snippet?.title?.toLowerCase() || '';
  const description = snippet?.description?.toLowerCase() || '';

  const sensitiveKeywords = [
    '18+', '18 +', '(18)', '[18+]',
    'adult', 'xxx', 'porn', 'bokep',
    'dewasa', 'vulgar', 'explicit',
  ];

  const hasSensitiveKeyword = sensitiveKeywords.some(
    (kw) => title.includes(kw) || description.includes(kw)
  );

  if (hasSensitiveKeyword) {
    return { safe: false, reason: 'Video mengandung indikasi konten dewasa' };
  }

  return {
    safe: true,
    videoId,
    title: snippet?.title,
    channel: snippet?.channelTitle,
    thumbnail: snippet?.thumbnails?.default?.url,
  };
};

module.exports = { checkYouTubeVideo, extractVideoId };