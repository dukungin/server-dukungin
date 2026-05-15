exports.proxyAudio = async (audioUrl, res) => {
  const response = await fetch(audioUrl);
  const buffer = await response.arrayBuffer();
  sendAudioBuffer(buffer, response.headers, res);
};

const sendAudioBuffer = (buffer, headers, res) => {
  res.set({
    'Content-Type': headers.get('content-type') || 'audio/mpeg',
    'Content-Length': buffer.byteLength,
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
  });
  res.send(Buffer.from(buffer));
};