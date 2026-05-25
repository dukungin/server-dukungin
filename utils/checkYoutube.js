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

  const { contentDetails, snippet } = video;

  const isLiveFromUrl = /youtube\.com\/live\//i.test(url);
  const isLive = isLiveFromUrl ||
    snippet?.liveBroadcastContent === 'live' ||
    snippet?.liveBroadcastContent === 'upcoming';

  // Video 18+
  if (contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') {
    return { safe: false, reason: 'Video dibatasi usia (18+)' };
  }

  // Blokir regional
  if (contentDetails?.regionRestriction?.blocked?.includes('ID')) {
    return { safe: false, reason: 'Video diblokir di Indonesia' };
  }

  // Sensitive keywords — skip untuk live
  if (!isLive) {
    const title = snippet?.title?.toLowerCase() || '';
    const description = snippet?.description?.toLowerCase() || '';
    const sensitiveKeywords = ['18+', '18 +', '(18)', '[18+]', 'adult', 'xxx', 'porn', 'bokep', 'dewasa', 'vulgar', 'explicit'];
    if (sensitiveKeywords.some(kw => title.includes(kw) || description.includes(kw))) {
      return { safe: false, reason: 'Video mengandung indikasi konten dewasa' };
    }
  }

  return {
    safe: true,
    videoId,
    isLive,
    title: snippet?.title,
    channel: snippet?.channelTitle,
  };
};

module.exports = { checkYouTubeVideo, extractVideoId };