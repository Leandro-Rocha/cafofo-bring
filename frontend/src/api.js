import { io } from 'socket.io-client';

const BASE = '/api/items';
const AISLES_BASE = '/api/aisles';

export const socket = io({ path: '/socket.io', transports: ['websocket'] });

export async function fetchItems() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Erro ao carregar itens');
  return res.json();
}

export async function addItem(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao adicionar item');
  return res.json();
}

export async function toggleItem(id) {
  const res = await fetch(`${BASE}/${id}/toggle`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Erro ao atualizar item');
  return res.json();
}

export async function deleteItem(id) {
  await fetch(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function clearPurchased() {
  await fetch(`${BASE}/purchased/clear`, { method: 'DELETE' });
}

export async function changeItemCategory(id, category) {
  const res = await fetch(`${BASE}/${id}/category`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  });
  if (!res.ok) throw new Error('Erro ao mover item');
  return res.json();
}

export async function fetchFrequent(limit = 12) {
  const res = await fetch(`${BASE}/frequent?limit=${limit}`);
  if (!res.ok) throw new Error('Erro ao carregar frequentes');
  return res.json();
}

// Aisles API
export async function fetchAisles() {
  const res = await fetch(AISLES_BASE);
  if (!res.ok) throw new Error('Erro ao carregar corredores');
  return res.json();
}

export async function reorderAisles(items) {
  const res = await fetch(`${AISLES_BASE}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error('Erro ao reordenar corredores');
  return res.json();
}

export async function createAisle(data) {
  const res = await fetch(AISLES_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao criar corredor');
  return res.json();
}

export async function updateAisle(id, data) {
  const res = await fetch(`${AISLES_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar corredor');
  return res.json();
}

export async function deleteAisle(id) {
  const res = await fetch(`${AISLES_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover corredor');
}
