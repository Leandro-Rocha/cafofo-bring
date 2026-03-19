const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.WA_DATA_DIR || path.join(__dirname, '../data');
const CONFIG_FILE = path.join(DATA_DIR, 'whatsapp-config.json');

const ZAP_URL = (process.env.ZAP_URL || '').replace(/\/$/, '');
const SELF_URL = (process.env.SELF_URL || '').replace(/\/$/, '');
const WEBHOOK_PATH = '/webhook/zap';

let config = {
  groupId: null,
  groupName: null,
  notifyGroupId: null,
  notifyGroupName: null,
  intervalMinutes: parseInt(process.env.WA_NOTIFY_INTERVAL) || 10,
  groqApiKey: null,
  webhookId: null,
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

// --- Groq (LLM item parsing) ---

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
          content: `Você extrai itens de lista de compras de mensagens em português.
Responda APENAS com JSON no formato {"items": [{"name": "Nome do item", "obs": "observação opcional"}]}.
Regras:
- "name": apenas o produto principal, primeira letra maiúscula, sem artigos desnecessários.
- "obs": detalhes como quantidade, marca, restrição, destinatário, ou qualquer qualificação. Omita se não houver.
- Exemplos: "suco para miguel" → name:"Suco", obs:"Para Miguel". "peito de frango sem osso" → name:"Peito de frango", obs:"Sem osso". "2 litros de leite integral" → name:"Leite integral", obs:"2 litros".
- Se não houver itens de compra, retorne {"items": []}.`,
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  if (!Array.isArray(parsed.items)) return null;
  return parsed.items
    .filter((i) => i?.name)
    .map((i) => ({ name: i.name, obs: i.obs || null }));
}

// --- HTTP helper ---

async function zapFetch(urlPath, options = {}) {
  if (!ZAP_URL) throw new Error('ZAP_URL não configurada');
  const res = await fetch(`${ZAP_URL}${urlPath}`, options);
  if (!res.ok) throw new Error(`cafofo-zap ${res.status}: ${await res.text()}`);
  return res.json();
}

// --- Webhook registration ---

async function registerWebhook() {
  if (!ZAP_URL || !SELF_URL || !config.groupId) return;

  if (config.webhookId) {
    try {
      await fetch(`${ZAP_URL}/webhooks/${config.webhookId}`, { method: 'DELETE' });
    } catch {}
    config.webhookId = null;
  }

  const data = await zapFetch('/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${SELF_URL}${WEBHOOK_PATH}`,
      groupId: config.groupId,
      events: ['audio'],
    }),
  });

  config.webhookId = data.id;
  saveConfig();
  console.log('[zap] webhook registrado:', data.id);
}

// --- Audio message handler ---

let audioMessageHandler = null;

function setAudioMessageHandler(fn) {
  audioMessageHandler = fn;
}

function getAudioMessageHandler() {
  return audioMessageHandler;
}

// --- Public API ---

async function connect() {
  await registerWebhook().catch((err) =>
    console.error('[zap] erro ao registrar webhook:', err.message)
  );
}

async function sendMessage(text) {
  if (!config.groupId) return;
  try {
    await zapFetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: config.groupId, text }),
    });
  } catch (err) {
    console.error('[zap] erro ao enviar:', err.message);
  }
}

async function sendNotifyMessage(text) {
  const target = config.notifyGroupId || config.groupId;
  if (!target) return;
  try {
    await zapFetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: target, text }),
    });
  } catch (err) {
    console.error('[zap] erro ao enviar notificação:', err.message);
  }
}

async function getGroups() {
  try {
    return await zapFetch('/groups');
  } catch {
    return [];
  }
}

async function getStatus() {
  let zapStatus = null;
  try {
    zapStatus = await zapFetch('/status');
  } catch {}
  return {
    status: zapStatus?.status || 'disconnected',
    hasGroup: !!config.groupId,
    groupName: config.groupName,
    groupId: config.groupId,
    notifyGroupName: config.notifyGroupName,
    notifyGroupId: config.notifyGroupId,
    intervalMinutes: config.intervalMinutes,
    hasGroqKey: !!(config.groqApiKey || process.env.GROQ_API_KEY),
    qr: zapStatus?.qr || null,
  };
}

function setGroup(groupId, groupName) {
  config.groupId = groupId;
  config.groupName = groupName;
  saveConfig();
  registerWebhook().catch((err) =>
    console.error('[zap] erro ao registrar webhook:', err.message)
  );
}

function setNotifyGroup(groupId, groupName) {
  config.notifyGroupId = groupId;
  config.notifyGroupName = groupName;
  saveConfig();
}

function setIntervalMinutes(minutes) {
  config.intervalMinutes = minutes;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, config.intervalMinutes * 60 * 1000);
  }
  saveConfig();
}

function setGroqApiKey(key) {
  config.groqApiKey = key || null;
  saveConfig();
}

async function disconnect() {
  if (config.webhookId) {
    try {
      await fetch(`${ZAP_URL}/webhooks/${config.webhookId}`, { method: 'DELETE' });
    } catch {}
    config.webhookId = null;
  }
  config.groupId = null;
  config.groupName = null;
  saveConfig();
}

module.exports = {
  connect,
  getStatus,
  getGroups,
  setGroup,
  setNotifyGroup,
  setIntervalMinutes,
  setGroqApiKey,
  parseItemsFromText,
  sendMessage,
  sendNotifyMessage,
  queueEvent,
  disconnect,
  setAudioMessageHandler,
  getAudioMessageHandler,
};
