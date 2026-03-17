export const CATEGORIES = [
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

export function getCategoryMeta(name) {
  return CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
}
