const express = require('express');
const router = express.Router();
const db = require('../db');
const wa = require('../zap');
const { addItem } = require('../itemService');

function normalizeName(name) {
  return name.toLowerCase().trim();
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

  const capitalized = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);

  // If user explicitly picked a non-"Outros" category, persist it as default
  if (category !== 'Outros') {
    db.prepare(
      'INSERT INTO item_defaults (name_normalized, category) VALUES (?, ?) ON CONFLICT(name_normalized) DO UPDATE SET category = excluded.category'
    ).run(normalizeName(capitalized), category);
  }

  const result = addItem({ name, category, quantity: quantity?.trim() || null, emoji: emoji || null });
  if (result.duplicate) return res.status(409).json({ error: 'Item já está na lista', item: result.duplicate });

  console.log(`[ITEM] ✅ Adicionado: "${result.item.name}" (categoria: ${result.item.category}, qtd: ${quantity || '-'})`);
  wa.queueEvent('added', result.item.name, 'App');
  req.app.get('io').emit('item:added', result.item);
  res.status(201).json(result.item);
});

router.patch('/:id/name', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  const capitalized = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
  const { quantity } = req.body;
  db.prepare('UPDATE items SET name = ?, quantity = ? WHERE id = ?')
    .run(capitalized, quantity?.trim() || null, req.params.id);
  console.log(`[ITEM] u270fufe0f  Renomeado: "${item.name}" u2192 "${capitalized}" (qtd: ${quantity?.trim() || '-'})`);

  // Keep history display_name in sync
  db.prepare('UPDATE item_history SET display_name = ? WHERE name_normalized = ?')
    .run(capitalized, normalizeName(item.name));

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  req.app.get('io').emit('item:updated', updated);
  res.json(updated);
});

router.patch('/:id/category', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria obrigatória' });

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  db.prepare('UPDATE items SET category = ? WHERE id = ?').run(category, req.params.id);
  console.log(`[ITEM]   Categoria: "${item.name}"  "${category}"`);

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
  console.log(`[ITEM] ${purchased ? 'ud83duded2 Comprado' : 'u21a9ufe0f  Desmarcado'}: "${item.name}"`);

  if (purchased) wa.queueEvent('purchased', item.name, null);

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  req.app.get('io').emit('item:updated', updated);
  res.json(updated);
});

router.delete('/purchased/clear', (req, res) => {
  db.prepare('DELETE FROM items WHERE purchased = 1').run();
  console.log('[ITEM]  Comprados limpos');
  wa.queueEvent('cleared', null, null);
  req.app.get('io').emit('purchased:cleared');
  res.status(204).end();
});

router.delete('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  console.log(`[ITEM]   Removido: "${item.name}"`);
  if (item) wa.queueEvent('removed', item.name, 'App');
  req.app.get('io').emit('item:deleted', { id: parseInt(req.params.id) });
  res.status(204).end();
});

module.exports = router;
