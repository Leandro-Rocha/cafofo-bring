const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const itemsRouter = require('./routes/items');

const db = require('./db');
const wa = require('./zap');
const { detectEmoji } = require('./emojiDetection');
wa.connect().catch((err) => console.error('[zap] falha ao conectar:', err.message));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});
app.use(cors());

// Alexa route must be registered BEFORE express.json() — adapter parses body itself
app.post('/alexa', require('./routes/alexa')(io));
app.get('/alexa', (_, res) => res.json({ ok: true, endpoint: 'alexa' }));

app.use(express.json({ limit: '20mb' }));
app.set('io', io);

wa.setAudioMessageHandler(async (text, reply) => {
  let names = await wa.parseItemsFromText(text);

  if (!names) {
    // Fallback: regex simples se Groq não estiver disponível
    names = text
      .replace(/^(adiciona[r]?|coloca[r]?|bota[r]?|põe|preciso\s+de|quero\s+que\s+adicione[s]?|quero|compra[r]?)\s+/i, '')
      .replace(/\bna\s+lista\b/gi, '')
      .trim()
      .split(/,|\s+e\s+|\s+mais\s+/i)
      .map((s) => ({ name: s.trim().replace(/[.,!?;:]+$/, '').trim(), obs: null }))
      .filter((i) => i.name);
  }

  if (!names.length) {
    await reply('❓ Não entendi o que adicionar.');
    return;
  }

  const added = [];
  const skipped = [];
  for (const { name, obs } of names) {
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    const existing = db.prepare('SELECT id FROM items WHERE lower(name) = lower(?) AND purchased = 0').get(capitalized);
    if (existing) { skipped.push(capitalized); continue; }
    const remembered = db.prepare('SELECT category FROM item_defaults WHERE name_normalized = ?').get(name.toLowerCase());
    const category = remembered?.category || 'Outros';
    const emoji = detectEmoji(capitalized);
    const result = db.prepare('INSERT INTO items (name, category, quantity, emoji) VALUES (?, ?, ?, ?)').run(capitalized, category, obs || null, emoji);
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    io.emit('item:added', item);
    db.prepare(`
      INSERT INTO item_history (name_normalized, display_name, emoji, count, last_added_at)
      VALUES (?, ?, NULL, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(name_normalized) DO UPDATE SET
        count = count + 1, display_name = excluded.display_name, last_added_at = CURRENT_TIMESTAMP
    `).run(name.toLowerCase(), capitalized);
    wa.queueEvent('added', capitalized, 'WhatsApp');
    added.push(obs ? `${capitalized} (${obs})` : capitalized);
  }

  const parts = [];
  if (added.length) parts.push(`✅ ${added.length > 1 ? 'Adicionados' : 'Adicionado'}: ${added.join(', ')}`);
  if (skipped.length) parts.push(`⚠️ Já ${skipped.length > 1 ? 'estão' : 'está'} na lista: ${skipped.join(', ')}`);
  await reply(parts.join('\n'));
});

app.post('/webhook/zap', (req, res) => {
  res.json({ ok: true });
  const { type, transcription, audioBase64, mimetype } = req.body;
  if (type !== 'audio') return;

  const handler = wa.getAudioMessageHandler();
  if (!handler) return;

  const reply = (text) => wa.sendMessage(text).catch(console.error);

  if (transcription) {
    handler(transcription, reply).catch(console.error);
  } else if (audioBase64) {
    const buffer = Buffer.from(audioBase64, 'base64');
    wa.transcribeAudio(buffer, mimetype)
      .then((text) => handler(text, reply))
      .catch((err) => console.error('[webhook/zap] erro ao transcrever:', err.message));
  }
});

app.use('/api/items', itemsRouter);
app.use('/api/aisles', require('./routes/aisles'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/debug/zap', async (req, res) => {
  res.json(await wa.getStatus());
});

app.post('/debug/zap/flush', async (req, res) => {
  wa.queueEvent('added', 'Teste debug', 'App');
  await wa.flushNow();
  res.json({ ok: true });
});

// Serve frontend static files if present (production)
const path = require('path');
const frontendPath = path.join(__dirname, '../public');
app.use(express.static(frontendPath));
app.get('*', (_, res) => res.sendFile(path.join(frontendPath, 'index.html')));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`API running on port ${PORT}`));
