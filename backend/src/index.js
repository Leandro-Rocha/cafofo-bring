const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const itemsRouter = require('./routes/items');

const db = require('./db');
const wa = require('./zap');
const { addItem } = require('./itemService');
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

// Remove leading action phrases and "na lista" / "a lista" / "à lista" from transcriptions.
// E.g. "Adicionando à lista manga" → "manga"
//      "Adiciono na lista pasta de amendoim" → "pasta de amendoim"
function normalizeTranscription(text) {
  return text
    .replace(/^(adicion(?:ando|ar?|o)|coloca[r]?|bota[r]?|põe|preciso\s+de|quero\s+que\s+adicione[s]?|quero|compra[r]?)\s*/i, '')
    .replace(/^(?:[aà]|na)\s+lista\b[,:\s]*/i, '')
    .replace(/\b(?:[aà]|na)\s+lista\b/gi, '')
    .trim();
}

wa.setAudioMessageHandler(async (rawText, reply) => {
  const text = normalizeTranscription(rawText);

  if (!text) {
    await reply('❓ Não entendi o que adicionar.');
    return;
  }

  let names = await wa.parseItemsFromText(text);

  if (!names) {
    // Fallback: regex simples se Groq não estiver disponível
    names = text
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
    const result = addItem({ name, quantity: obs || null });
    if (result.duplicate) {
      const cap = result.duplicate.name;
      skipped.push(cap);
      continue;
    }
    io.emit('item:added', result.item);
    wa.queueEvent('added', result.item.name, 'WhatsApp');
    added.push(obs ? `${result.item.name} (${obs})` : result.item.name);
  }

  const parts = [];
  if (added.length) parts.push(`✅ ${added.length > 1 ? 'Adicionados' : 'Adicionado'}: ${added.join(', ')}`);
  if (skipped.length) parts.push(`⚠️ Já ${skipped.length > 1 ? 'estão' : 'está'} na lista: ${skipped.join(', ')}`);
  await reply(parts.join('\n'));
});

app.post('/webhook/zap', (req, res) => {
  res.json({ ok: true });
  const { type, transcription } = req.body;
  if (type !== 'audio' || !transcription) return;

  const handler = wa.getAudioMessageHandler();
  if (!handler) return;

  const reply = (text) => wa.sendMessage(text).catch(console.error);
  handler(transcription, reply).catch(console.error);
});

app.use('/api/items', itemsRouter);
app.use('/api/aisles', require('./routes/aisles'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.get('/health', (_, res) => res.json({ ok: true }));


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
