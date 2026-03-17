import { io } from 'socket.io-client';

const BASE = '/api/items';

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
