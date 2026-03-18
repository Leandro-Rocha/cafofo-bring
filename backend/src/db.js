const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/shopping.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Outros',
    quantity TEXT,
    emoji TEXT,
    purchased INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchased_at DATETIME
  )
`);

try { db.exec('ALTER TABLE items ADD COLUMN emoji TEXT'); } catch {}  // migration

db.exec(`
  CREATE TABLE IF NOT EXISTS aisles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    emoji TEXT,
    color TEXT,
    bg TEXT,
    border TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS item_defaults (
    name_normalized TEXT PRIMARY KEY,
    category TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS item_history (
    name_normalized TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    emoji TEXT,
    count INTEGER NOT NULL DEFAULT 1,
    last_added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed aisles if table is empty
const aisleCount = db.prepare('SELECT COUNT(*) as cnt FROM aisles').get();
if (aisleCount.cnt === 0) {
  const DEFAULTS = [
    { name: 'Frutas e Verduras', emoji: '🥦', color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
    { name: 'Laticínios',        emoji: '🧀', color: '#eab308', bg: '#fefce8', border: '#fde047' },
    { name: 'Carnes',            emoji: '🥩', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
    { name: 'Bebidas',           emoji: '🥤', color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
    { name: 'Padaria',           emoji: '🍞', color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
    { name: 'Limpeza',           emoji: '🧹', color: '#06b6d4', bg: '#ecfeff', border: '#67e8f9' },
    { name: 'Higiene',           emoji: '🧴', color: '#ec4899', bg: '#fdf2f8', border: '#f9a8d4' },
    { name: 'Congelados',        emoji: '🧊', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
    { name: 'Outros',            emoji: '📦', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  ];
  const insert = db.prepare(
    'INSERT INTO aisles (name, emoji, color, bg, border, position) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((rows) => {
    rows.forEach((row, i) => insert.run(row.name, row.emoji, row.color, row.bg, row.border, i));
  });
  insertMany(DEFAULTS);
}

module.exports = db;
