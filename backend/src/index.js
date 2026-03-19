const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const itemsRouter = require('./routes/items');

const db = require('./db');
const wa = require('./whatsapp');
const { detectEmoji } = require('./emojiDetection');
wa.connect().catch((err) => console.error('[whatsapp] falha ao conectar:', err.message));

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

app.use(express.json());
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
      .map((s) => s.trim().replace(/[.,!?;:]+$/, '').trim())
      .filter(Boolean);
  }

  if (!names.length) {
    await reply('❓ Não entendi o que adicionar.');
    return;
  }

  const added = [];
  for (const name of names) {
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    const remembered = db.prepare('SELECT category FROM item_defaults WHERE name_normalized = ?').get(name.toLowerCase());
    const category = remembered?.category || 'Outros';
    const emoji = detectEmoji(capitalized);
    const result = db.prepare('INSERT INTO items (name, category, emoji) VALUES (?, ?, ?)').run(capitalized, category, emoji);
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    io.emit('item:added', item);
    db.prepare(`
      INSERT INTO item_history (name_normalized, display_name, emoji, count, last_added_at)
      VALUES (?, ?, NULL, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(name_normalized) DO UPDATE SET
        count = count + 1, display_name = excluded.display_name, last_added_at = CURRENT_TIMESTAMP
    `).run(name.toLowerCase(), capitalized);
    wa.queueEvent('added', capitalized, 'WhatsApp');
    added.push(capitalized);
  }

  await reply(`✅ ${added.length > 1 ? 'Adicionados' : 'Adicionado'}: ${added.join(', ')}`);
});

app.use('/api/items', itemsRouter);
app.use('/api/aisles', require('./routes/aisles'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/notify', require('./routes/notify'));
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
