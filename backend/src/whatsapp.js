const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.WA_DATA_DIR || path.join(__dirname, '../data');
const AUTH_DIR = path.join(DATA_DIR, 'baileys-auth');
const CONFIG_FILE = path.join(DATA_DIR, 'whatsapp-config.json');

let sock = null;
let currentQR = null;
let status = 'disconnected';

let config = {
  groupId: null,
  groupName: null,
  intervalMinutes: parseInt(process.env.WA_NOTIFY_INTERVAL) || 10,
};

try {
  const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  config = { ...config, ...saved };
} catch {}

function saveConfig() {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// --- Event queue / batching ---

const eventQueue = [];
let flushTimer = null;

function queueEvent(type, itemName, source) {
  eventQueue.push({ type, itemName, source });
  if (!flushTimer) {
    flushTimer = setTimeout(flush, config.intervalMinutes * 60 * 1000);
  }
}

async function flush() {
  flushTimer = null;
  if (eventQueue.length === 0) return;
  const events = eventQueue.splice(0);

  const added = events.filter((e) => e.type === 'added');
  const removed = events.filter((e) => e.type === 'removed');
  const purchased = events.filter((e) => e.type === 'purchased');
  const cleared = events.some((e) => e.type === 'cleared');

  const lines = ['🛒 *Lista Cafofo*\n'];

  if (added.length > 0) {
    lines.push('➕ *Adicionados:*');
    added.forEach((e) => lines.push(`  • ${e.itemName}${e.source ? ` _(${e.source})_` : ''}`));
  }
  if (removed.length > 0) {
    lines.push('\n🗑️ *Removidos:*');
    removed.forEach((e) => lines.push(`  • ${e.itemName}${e.source ? ` _(${e.source})_` : ''}`));
  }
  if (purchased.length > 0) {
    lines.push('\n✅ *Comprados:*');
    purchased.forEach((e) => lines.push(`  • ${e.itemName}`));
  }
  if (cleared) {
    lines.push('\n🧹 _Lista de comprados foi limpa._');
  }

  await sendMessage(lines.join('\n'));
}

// --- Connection ---

async function connect() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[whatsapp] WA v${version.join('.')} isLatest=${isLatest}`);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR = await QRCode.toDataURL(qr);
      status = 'connecting';
      console.log('[whatsapp] QR gerado');
    }
    if (connection === 'open') {
      currentQR = null;
      status = 'connected';
      console.log('[whatsapp] conectado');
    }
    if (connection === 'close') {
      status = 'disconnected';
      currentQR = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log('[whatsapp] desconectado, código:', code, 'reconectar:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(connect, 5000);
      } else {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        console.log('[whatsapp] sessão encerrada, credenciais removidas');
      }
    }
  });
}

// --- Public API ---

async function sendMessage(text) {
  if (!sock || status !== 'connected' || !config.groupId) return;
  try {
    await sock.sendMessage(config.groupId, { text });
  } catch (err) {
    console.error('[whatsapp] erro ao enviar:', err.message);
  }
}

async function getGroups() {
  if (!sock || status !== 'connected') return [];
  try {
    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups)
      .map((g) => ({ id: g.id, name: g.subject }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function setGroup(groupId, groupName) {
  config.groupId = groupId;
  config.groupName = groupName;
  saveConfig();
}

function setIntervalMinutes(minutes) {
  config.intervalMinutes = minutes;
  // Reschedule pending flush with new interval if there's one pending
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, config.intervalMinutes * 60 * 1000);
  }
  saveConfig();
}

function getStatus() {
  return {
    status,
    hasGroup: !!config.groupId,
    groupName: config.groupName,
    groupId: config.groupId,
    intervalMinutes: config.intervalMinutes,
    qr: currentQR,
  };
}

function disconnect() {
  if (sock) {
    try { sock.logout(); } catch {}
    sock = null;
  }
  status = 'disconnected';
  currentQR = null;
  config.groupId = null;
  config.groupName = null;
  saveConfig();
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
}

module.exports = { connect, getStatus, getGroups, setGroup, setIntervalMinutes, sendMessage, queueEvent, disconnect };
