const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, downloadMediaMessage } = require('@whiskeysockets/baileys');
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
  notifyGroupId: null,
  notifyGroupName: null,
  intervalMinutes: parseInt(process.env.WA_NOTIFY_INTERVAL) || 10,
  groqApiKey: null,
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

// --- Audio transcription ---

let onAudioMessage = null;

function setAudioMessageHandler(fn) {
  onAudioMessage = fn;
}

function setGroqApiKey(key) {
  config.groqApiKey = key || null;
  saveConfig();
}

async function parseItemsFromText(text) {
  const apiKey = config.groqApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Você extrai itens de lista de compras de mensagens em português. Responda APENAS com JSON no formato {"items": ["item1", "item2"]}. Normalize os nomes: sem pontuação, sem artigos desnecessários, primeira letra maiúscula. Se não houver itens de compra na mensagem, retorne {"items": []}.',
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return Array.isArray(parsed.items) ? parsed.items.filter(Boolean) : null;
}

async function transcribeAudio(buffer, mimetype) {
  const apiKey = config.groqApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key não configurada');

  const ext = (mimetype || '').includes('ogg') ? 'ogg' : 'mp4';
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimetype || 'audio/ogg' }), `audio.${ext}`);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'pt');
  form.append('response_format', 'text');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  return (await res.text()).trim();
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

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!config.groupId || msg.key.remoteJid !== config.groupId) continue;

      const audio = msg.message?.audioMessage;
      if (!audio || !onAudioMessage) continue;

      const reply = (text) => sock.sendMessage(config.groupId, { text }, { quoted: msg }).catch(() => {});

      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
          logger: pino({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage,
        });
        const text = await transcribeAudio(buffer, audio.mimetype);
        console.log(`[whatsapp] áudio transcrito: "${text}"`);
        await onAudioMessage(text, reply);
      } catch (err) {
        console.error('[whatsapp] erro ao processar áudio:', err.message);
        await reply('❌ Erro ao processar o áudio.').catch(() => {});
      }
    }
  });

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

async function sendNotifyMessage(text) {
  const target = config.notifyGroupId || config.groupId;
  if (!sock || status !== 'connected' || !target) return;
  try {
    await sock.sendMessage(target, { text });
  } catch (err) {
    console.error('[whatsapp] erro ao enviar notificação:', err.message);
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

function setNotifyGroup(groupId, groupName) {
  config.notifyGroupId = groupId;
  config.notifyGroupName = groupName;
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
    notifyGroupName: config.notifyGroupName,
    notifyGroupId: config.notifyGroupId,
    intervalMinutes: config.intervalMinutes,
    hasGroqKey: !!config.groqApiKey,
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

module.exports = { connect, getStatus, getGroups, setGroup, setNotifyGroup, setIntervalMinutes, setGroqApiKey, parseItemsFromText, sendMessage, sendNotifyMessage, queueEvent, disconnect, setAudioMessageHandler };
