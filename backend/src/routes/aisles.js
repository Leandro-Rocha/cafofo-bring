const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/aisles — list all aisles ordered by position
router.get('/', (req, res) => {
  const aisles = db.prepare('SELECT * FROM aisles ORDER BY position ASC').all();
  res.json(aisles);
});

// POST /api/aisles — create a new aisle
router.post('/', (req, res) => {
  const { name, emoji, color, bg, border } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

  const maxRow = db.prepare('SELECT MAX(position) as maxPos FROM aisles').get();
  const position = (maxRow.maxPos ?? -1) + 1;

  try {
    const result = db.prepare(
      'INSERT INTO aisles (name, emoji, color, bg, border, position) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name.trim(), emoji || '📦', color || '#6b7280', bg || '#f9fafb', border || '#d1d5db', position);

    const aisle = db.prepare('SELECT * FROM aisles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(aisle);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Corredor já existe' });
    }
    throw err;
  }
});

// PUT /api/aisles/reorder — update positions in a transaction
router.put('/reorder', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Array esperado' });

  const update = db.prepare('UPDATE aisles SET position = ? WHERE id = ?');
  const reorderAll = db.transaction((rows) => {
    rows.forEach(({ id, position }) => update.run(position, id));
  });
  reorderAll(items);

  const aisles = db.prepare('SELECT * FROM aisles ORDER BY position ASC').all();
  res.json(aisles);
});

// PATCH /api/aisles/:id — update aisle fields; rename cascades to items
router.patch('/:id', (req, res) => {
  const aisle = db.prepare('SELECT * FROM aisles WHERE id = ?').get(req.params.id);
  if (!aisle) return res.status(404).json({ error: 'Corredor não encontrado' });

  const { name, emoji, color, bg, border, hidden } = req.body;

  const newName    = name    !== undefined ? name.trim()  : aisle.name;
  const newEmoji   = emoji   !== undefined ? emoji        : aisle.emoji;
  const newColor   = color   !== undefined ? color        : aisle.color;
  const newBg      = bg      !== undefined ? bg           : aisle.bg;
  const newBorder  = border  !== undefined ? border       : aisle.border;
  const newHidden  = hidden  !== undefined ? (hidden ? 1 : 0) : aisle.hidden;

  const doUpdate = db.transaction(() => {
    if (newName !== aisle.name) {
      db.prepare('UPDATE items SET category = ? WHERE category = ?').run(newName, aisle.name);
    }
    db.prepare(
      'UPDATE aisles SET name = ?, emoji = ?, color = ?, bg = ?, border = ?, hidden = ? WHERE id = ?'
    ).run(newName, newEmoji, newColor, newBg, newBorder, newHidden, req.params.id);
  });

  try {
    doUpdate();
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Nome já em uso' });
    }
    throw err;
  }

  const updated = db.prepare('SELECT * FROM aisles WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/aisles/:id — move items to 'Outros', then delete aisle
router.delete('/:id', (req, res) => {
  const aisle = db.prepare('SELECT * FROM aisles WHERE id = ?').get(req.params.id);
  if (!aisle) return res.status(404).json({ error: 'Corredor não encontrado' });
  if (aisle.name === 'Outros') return res.status(400).json({ error: 'Não é possível remover o corredor padrão' });

  const doDelete = db.transaction(() => {
    db.prepare("UPDATE items SET category = 'Outros' WHERE category = ?").run(aisle.name);
    db.prepare('DELETE FROM aisles WHERE id = ?').run(req.params.id);
  });
  doDelete();

  res.status(204).end();
});

module.exports = router;
