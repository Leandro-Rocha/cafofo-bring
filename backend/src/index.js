const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const itemsRouter = require('./routes/items');

require('./db'); // init database
const wa = require('./whatsapp');
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
