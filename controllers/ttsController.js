const edgeTTS = require('edge-tts');

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
      text      = '',
      voiceName = 'id-ID-GadisNeural',
      rate      = '+0%',
      pitch     = '+0Hz',
      volume    = '+0%',
    } = req.body;

    const cleanText = text.trim().substring(0, 500);
    if (!cleanText) return res.status(400).json({ message: 'Text kosong' });

    const validVoice = VOICES.find(v => v.name === voiceName)
      ? voiceName
      : 'id-ID-GadisNeural';

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-cache');
    res.set('Access-Control-Allow-Origin', '*');

    // edge-tts pakai communicate, bukan constructor langsung
    const communicate = new edgeTTS.Communicate(cleanText, {
      voice:  validVoice,
      rate,
      pitch,
      volume,
    });

    const stream = communicate.stream();

    for await (const chunk of stream) {
      if (chunk.type === 'audio') {
        res.write(chunk.data);
      }
    }

    res.end();

  } catch (err) {
    console.error('[TTS synthesize error]', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'TTS gagal', error: err.message });
    }
  }
};