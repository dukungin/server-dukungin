const { execFile } = require('child_process');
const { PassThrough } = require('stream');
const path = require('path');

// Daftar voice edge-tts yang tersedia
const VOICES = [
  { name: 'id-ID-GadisNeural',  gender: 'Female', lang: 'id-ID', label: '🇮🇩 Gadis – Perempuan (Neural)' },
  { name: 'id-ID-ArdiNeural',   gender: 'Male',   lang: 'id-ID', label: '🇮🇩 Ardi – Laki-laki (Neural)' },
  { name: 'en-US-JennyNeural',  gender: 'Female', lang: 'en-US', label: '🇺🇸 Jenny – Perempuan (Neural)' },
  { name: 'en-US-GuyNeural',    gender: 'Male',   lang: 'en-US', label: '🇺🇸 Guy – Laki-laki (Neural)' },
  { name: 'en-GB-SoniaNeural',  gender: 'Female', lang: 'en-GB', label: '🇬🇧 Sonia – Perempuan (Neural)' },
  { name: 'ja-JP-NanamiNeural', gender: 'Female', lang: 'ja-JP', label: '🇯🇵 Nanami – Perempuan (Neural)' },
  { name: 'ko-KR-SunHiNeural',  gender: 'Female', lang: 'ko-KR', label: '🇰🇷 SunHi – Perempuan (Neural)' },
];

exports.getVoiceList = (req, res) => {
  res.json({ voices: VOICES });
};

exports.synthesize = async (req, res) => {
  try {
    const {
      text = '',
      voiceName  = 'id-ID-GadisNeural',
      rate       = '+0%',    // contoh: '+20%', '-10%'
      pitch      = '+0Hz',   // contoh: '+5Hz', '-3Hz'
      volume     = '+0%',    // contoh: '+50%'
    } = req.body;

    const cleanText = text.trim().substring(0, 500);
    if (!cleanText) return res.status(400).json({ message: 'Text kosong' });

    // Validasi voice
    const validVoice = VOICES.find(v => v.name === voiceName)
      ? voiceName
      : 'id-ID-GadisNeural';

    // edge-tts dipanggil via CLI (npm install -g edge-tts atau pip install edge-tts)
    // Kita pakai edge-tts npm package
    const EdgeTTS = require('edge-tts-node');

    const tts = new EdgeTTS();
    await tts.setMetadata(validVoice, EdgeTTS.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      rate,
      pitch,
      volume,
    });

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-cache');
    res.set('Access-Control-Allow-Origin', '*');

    const readable = await tts.toStream(cleanText);
    readable.pipe(res);

    readable.on('error', (err) => {
      console.error('[TTS stream error]', err);
      if (!res.headersSent) res.status(500).json({ message: 'Stream error' });
    });

  } catch (err) {
    console.error('[TTS synthesize error]', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'TTS gagal', error: err.message });
    }
  }
};