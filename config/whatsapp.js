// config/whatsapp.js - VERSI AKHIR
const { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  delay 
} = require('baileys');
const fs = require('fs');
const path = require('path');

let sock = null;
let isReady = false;
let pairingCode = null;

const sendTracker = { date: null, count: 0, MAX_PER_DAY: 50 };

const initWhatsApp = async () => {
  console.log('[WA] Starting Baileys...');
  
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

    console.log('[WA] Creds:', state.creds?.me?.id ? 'EXISTS' : 'EMPTY');

    sock = makeWASocket({
      version,
      auth: state,
      browser: ['Dukungin Server', 'Chrome', '120'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, code } = update;
      console.log('[WA] Update:', connection);
      
      if (code && !isReady) {
        console.log('\n🎯 PAIRING CODE:', code);
        console.log('📱 WhatsApp → Settings → Linked Devices\n');
        pairingCode = code;
      }
      
      if (connection === 'open') {
        isReady = true;
        console.log('✅ WhatsApp TERHUBUNG!');
      } else if (connection === 'close') {
        isReady = false;
        console.log('❌ WA disconnected');
      }
    });

    // ✅ TUNGGU WEBSOCKET OPEN LEBIH LAMA
    console.log('[WA] Waiting for WebSocket...');
    for (let i = 0; i < 30; i++) {
      await delay(500);
      if (sock.ws && sock.ws.readyState === 1) {
        console.log('[WA] ✅ WebSocket OPEN after', (i+1)/2, 'seconds');
        break;
      }
      if (i === 29) {
        console.log('[WA] ❌ WebSocket timeout!');
        return null;
      }
    }

    // ✅ BARU REQUEST PAIRING KALO GAK ADA CREDS
    if (!state.creds?.me?.id) {
      console.log('[WA] Requesting pairing code...');
      try {
        // ⬅️ TAMBAH DELAY LEBIH LAMA!
        await delay(5000);
        
        const code = await sock.requestPairingCode('6289513093406');
        console.log('\n🎯 PAIRING CODE:', code);
        console.log('📱 WhatsApp → Settings → Linked Devices → Link a device');
        console.log('📝 Masukkan kode ini:', code, '\n');
        pairingCode = code;
      } catch (e) {
        console.log('[WA] Pairing error:', e.message);
      }
    }

    // ✅ TUNGGU SAMPAI TERHUBUNG
    for (let i = 0; i < 120; i++) {
      await delay(1000);
      if (isReady) {
        console.log('[WA] ✅ Connected after', i, 'seconds');
        break;
      }
      if (i % 15 === 0) {
        console.log('[WA] Still waiting...', i, 'seconds');
      }
    }

    if (!isReady && pairingCode) {
      console.log('\n📱 MASUKKAN KODEINI KE WHATSAPP SEKARANG!');
      console.log('🎯 KODE:', pairingCode, '\n');
    }
    
    return sock;
    
  } catch (err) {
    console.error('[WA] Error:', err.message);
    return null;
  }
};

// Exports
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