const express = require('express');
const router = express.Router();
const db = require('../db');
const wa = require('../whatsapp');

function normalizeName(name) {
  return name.toLowerCase().trim();
}

function upsertHistory(db, nameNormalized, displayName, emoji) {
  db.prepare(`
    INSERT INTO item_history (name_normalized, display_name, emoji, count, last_added_at)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(name_normalized) DO UPDATE SET
      count = count + 1,
      display_name = excluded.display_name,
      emoji = excluded.emoji,
      last_added_at = CURRENT_TIMESTAMP
  `).run(nameNormalized, displayName, emoji || null);
}

router.get('/frequent', (req, res) => {
  const limit = parseInt(req.query.limit) || 12;
  const items = db.prepare(
    'SELECT display_name as name, emoji FROM item_history ORDER BY count DESC, last_added_at DESC LIMIT ?'
  ).all(limit);
  res.json(items);
});

router.get('/', (req, res) => {
  const items = db.prepare(
    'SELECT * FROM items ORDER BY purchased ASC, category ASC, created_at ASC'
  ).all();
  res.json(items);
});

router.post('/', (req, res) => {
  const { name, category = 'Outros', quantity, emoji } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

  const normalized = name.trim();
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  // Check remembered category for this item name
  const remembered = db.prepare(
    'SELECT category FROM item_defaults WHERE name_normalized = ?'
  ).get(normalizeName(capitalized));

  const resolvedCategory = remembered?.category || category;

  // If user explicitly picked a non-"Outros" category, save/update the default
  if (category !== 'Outros') {
    db.prepare(
      'INSERT INTO item_defaults (name_normalized, category) VALUES (?, ?) ON CONFLICT(name_normalized) DO UPDATE SET category = excluded.category'
    ).run(normalizeName(capitalized), category);
  }

  const result = db.prepare(
    'INSERT INTO items (name, category, quantity, emoji) VALUES (?, ?, ?, ?)'
  ).run(capitalized, resolvedCategory, quantity?.trim() || null, emoji || null);

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  upsertHistory(db, normalizeName(capitalized), capitalized, item.emoji);
  wa.queueEvent('added', capitalized, 'App');
  req.app.get('io').emit('item:added', item);
  res.status(201).json(item);
});

router.patch('/:id/category', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria obrigatória' });

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  db.prepare('UPDATE items SET category = ? WHERE id = ?').run(category, req.params.id);

  // Save/update remembered category for this item name
  db.prepare(
    'INSERT INTO item_defaults (name_normalized, category) VALUES (?, ?) ON CONFLICT(name_normalized) DO UPDATE SET category = excluded.category'
  ).run(normalizeName(item.name), category);

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  req.app.get('io').emit('item:updated', updated);
  res.json(updated);
});

router.patch('/:id/toggle', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  const purchased = item.purchased ? 0 : 1;
  const purchased_at = purchased ? new Date().toISOString() : null;

  db.prepare('UPDATE items SET purchased = ?, purchased_at = ? WHERE id = ?')
    .run(purchased, purchased_at, req.params.id);

  if (purchased) wa.queueEvent('purchased', item.name, null);

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  req.app.get('io').emit('item:updated', updated);
  res.json(updated);
});

router.delete('/purchased/clear', (req, res) => {
  db.prepare('DELETE FROM items WHERE purchased = 1').run();
  wa.queueEvent('cleared', null, null);
  req.app.get('io').emit('purchased:cleared');
  res.status(204).end();
});

router.delete('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  if (item) wa.queueEvent('removed', item.name, 'App');
  req.app.get('io').emit('item:deleted', { id: parseInt(req.params.id) });
  res.status(204).end();
});

module.exports = router;
