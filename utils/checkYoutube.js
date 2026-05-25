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
      part: ['contentDetails', 'status', 'snippet', 'liveStreamingDetails'],
      id: [videoId],
    });
    video = res.data.items?.[0];
  } catch (err) {
    console.error('[YouTube API] Error:', err.message);
    throw new Error('YouTube API tidak tersedia');
  }

  if (!video) {
    return { safe: false, reason: 'Video tidak ditemukan atau private' };
  }

  const { contentDetails, status, snippet, liveStreamingDetails } = video;

  // ── Deteksi apakah ini live stream ──────────────────────────
  const isLiveFromUrl = /youtube\.com\/live\//i.test(url);
  const isLive = isLiveFromUrl ||
               snippet?.liveBroadcastContent === 'live' ||
               snippet?.liveBroadcastContent === 'upcoming' ||
               !!liveStreamingDetails;
               
  console.log(`[YT Check] videoId: ${videoId} | isLive: ${isLive} | embeddable: ${status?.embeddable} | liveBroadcastContent: ${snippet?.liveBroadcastContent}`);

  // Video 18+
  if (contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') {
    return { safe: false, reason: 'Video dibatasi usia (18+)' };
  }

  // Embeddable check — skip untuk live
  if (!isLive && status?.embeddable === false) {
    return { safe: false, reason: 'Video tidak bisa ditampilkan (embed dinonaktifkan)' };
  }


  // Blokir regional
  const regionRestriction = contentDetails?.regionRestriction;
  if (regionRestriction?.blocked?.includes('ID')) {
    return { safe: false, reason: 'Video diblokir di Indonesia' };
  }

  // Sensitive keywords — skip untuk live (judul live sering berubah)
  if (!isLive) {
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
  }

  return {
    safe: true,
    videoId,
    isLive,
    title: snippet?.title,
    channel: snippet?.channelTitle,
    thumbnail: snippet?.thumbnails?.default?.url,
  };
};

module.exports = { checkYouTubeVideo, extractVideoId };