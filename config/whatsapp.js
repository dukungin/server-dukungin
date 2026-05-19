const { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
} = require('baileys');
const fs = require('fs');
const path = require('path');

let sock = null;
let isReady = false;
let pairingCode = null;

const sendTracker = { date: null, count: 0, MAX_PER_DAY: 50 };

// ✅ BUAT LOGGER SEDERHANA
const logger = {
  info: (...args) => console.log('[WA INFO]', ...args),
  error: (...args) => console.error('[WA ERROR]', ...args),
  warn: (...args) => console.warn('[WA WARN]', ...args),
  debug: (...args) => console.log('[WA DEBUG]', ...args),
  child: () => logger,  // ⬅️ FIX DI SINI
};

const initWhatsApp = async () => {
  console.log('[WA] Starting Baileys with Pairing Code...');
  
  if (sock && isReady) {
    console.log('[WA] Already connected!');
    return sock;
  }

  try {
    const sessionDir = './wa_session_baileys';
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // ✅ TANPA OPTION LOGGER!
    sock = makeWASocket({
      version,
      auth: state,
      // ✌️ Hapus: logger: console,
      browser: ['Dukungin Server', 'Chrome', '120'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, code } = update;
      
      if (code) {
        console.log('\n🎯 PAIRING CODE:', code);
        console.log('📱 Buka WhatsApp → Settings → Linked Devices → Link a Device');
        console.log('🔢 Masukin kode:', code, '\n');
        pairingCode = code;
      }
      
      if (connection === 'open') {
        isReady = true;
        pairingCode = null;
        console.log('✅ WhatsApp TERHUBUNG!');
      } else if (connection === 'close') {
        isReady = false;
        console.log('❌ WA disconnected');
      }
    });

    // Wait for connection (max 2 menit)
    let attempts = 0;
    while (!isReady && attempts < 120) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      if (pairingCode) {
        console.log('[WA] Waiting for pairing...', attempts);
      } else if (!isReady) {
        console.log('[WA] Waiting for connection...', attempts);
      }
    }

    if (!isReady) {
      console.log('[WA] ❌ Connection timeout!');
    }

    return sock;
    
  } catch (err) {
    console.error('[WA] Error:', err.message);
    console.error('[WA] Stack:', err.stack);
    return null;
  }
};

const canSendMessage = () => {
  const today = new Date().toISOString().split('T')[0];
  if (sendTracker.date !== today) {
    sendTracker.date = today;
    sendTracker.count = 0;
  }
  return sendTracker.count < sendTracker.MAX_PER_DAY;
};

const incrementSendCount = () => sendTracker.count++;

const getSendStats = () => ({
  sent: sendTracker.count,
  remaining: sendTracker.MAX_PER_DAY - sendTracker.count,
  max: sendTracker.MAX_PER_DAY,
});

const getClient = () => sock;
const getIsReady = () => isReady;
const getQRCode = () => pairingCode;

const waitUntilReady = (ms = 120000) => new Promise((resolve, reject) => {
  if (isReady) return resolve(true);
  const t = setTimeout(() => reject(new Error('WA timeout')), ms);
  const i = setInterval(() => { if (isReady) { clearTimeout(t); clearInterval(i); resolve(true); } }, 1000);
});

const sendMessage = async (phone, text) => {
  if (!sock || !isReady) throw new Error('WA not connected');
  const jid = phone.replace('@s.whatsapp.net', '') + '@s.whatsapp.net';
  await sock.sendMessage(jid, { text });
  incrementSendCount();
};

module.exports = { 
  initWhatsApp, getClient, getIsReady, getQRCode, waitUntilReady,
  canSendMessage, incrementSendCount, getSendStats, sendMessage
};