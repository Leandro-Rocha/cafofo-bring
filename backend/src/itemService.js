const db = require('./db');
const { detectEmoji } = require('./emojiDetection');

/**
 * Inserts an item into the list.
 * Returns { item } on success or { duplicate: existingItem } if already in list (unpurchased).
 */
function addItem({ name, category = 'Outros', quantity = null, emoji: emojiOverride = null }) {
  const capitalized = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
  const normalized = capitalized.toLowerCase();

  const existing = db
    .prepare('SELECT * FROM items WHERE lower(name) = lower(?) AND purchased = 0')
    .get(capitalized);
  if (existing) return { duplicate: existing };

  const remembered = db
    .prepare('SELECT category FROM item_defaults WHERE name_normalized = ?')
    .get(normalized);
  const resolvedCategory = remembered?.category || category;
  const emoji = emojiOverride || detectEmoji(capitalized);

  const result = db
    .prepare('INSERT INTO items (name, category, quantity, emoji) VALUES (?, ?, ?, ?)')
    .run(capitalized, resolvedCategory, quantity || null, emoji);

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);

  db.prepare(`
    INSERT INTO item_history (name_normalized, display_name, emoji, count, last_added_at)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(name_normalized) DO UPDATE SET
      count = count + 1,
      display_name = excluded.display_name,
      emoji = excluded.emoji,
      last_added_at = CURRENT_TIMESTAMP
  `).run(normalized, capitalized, item.emoji || null);

  return { item };
}

module.exports = { addItem };
