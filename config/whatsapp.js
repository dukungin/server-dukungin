const { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  delay 
} = require('baileys');
const fs = require('fs');
const QRCode = require('qrcode');

let sock = null;
let isReady = false;
let qrCodeUrl = null;

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

    console.log('[WA] Has creds?', !!state.creds?.me?.id);

    sock = makeWASocket({
      version,
      auth: state,
      browser: ['Dukungin Server', 'Chrome', '120'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, qr } = update;
      
      if (qr) {
        qrCodeUrl = 'https://wa.me/settings/linked_devices#' + qr;
        
        // ✅ GENERATE QR IMAGE!
        try {
          const qrImage = await QRCode.toDataURL(qrCodeUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          
          console.log('\n========================================');
          console.log('📱 SCAN QR INI DENGAN WHATSAPP HP:');
          console.log('========================================\n');
          console.log(qrImage);  // ⬅️ QR Image Base64
          console.log('\n📱 Atau link: https://wa.me/settings/linked_devices');
          console.log('========================================\n');
        } catch (e) {
          console.log('\n📱 Link to open:');
          console.log(qrCodeUrl);
        }
      }
      
      if (connection === 'open') {
        isReady = true;
        qrCodeUrl = null;
        console.log('\n✅✅ WhatsApp TERHUBUNG! ✅✅\n');
      }
    });

    console.log('[WA] Waiting for connection...');
    for (let i = 0; i < 120; i++) {
      await delay(1000);
      
      if (qrCodeUrl) {
        console.log(`[WA] Waiting... ${i}s - QR ready!`);
      }
      if (isReady) {
        console.log('[WA] ✅ Connected!', i, 's');
        break;
      }
    }

    if (isReady) {
      console.log('✅✅ WhatsApp SIAP! ✅✅');
    }
    
    return sock;
    
  } catch (err) {
    console.error('[WA] Error:', err.message);
    return null;
  }
};

// Exports (sama)
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
const getQRCode = () => qrCodeUrl;

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