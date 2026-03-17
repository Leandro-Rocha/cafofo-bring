import { useEffect, useState, useCallback } from 'react';
import { fetchItems, addItem, toggleItem, deleteItem, clearPurchased, socket } from './api';
import Header from './components/Header';
import CategorySection from './components/CategorySection';
import PurchasedSection from './components/PurchasedSection';
import AddItemModal from './components/AddItemModal';

export default function App() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchItems();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    socket.on('item:added', (item) => setItems((prev) => [...prev, item]));
    socket.on('item:updated', (item) =>
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
    );
    socket.on('item:deleted', ({ id }) =>
      setItems((prev) => prev.filter((i) => i.id !== id))
    );
    socket.on('purchased:cleared', () =>
      setItems((prev) => prev.filter((i) => !i.purchased))
    );

    return () => socket.removeAllListeners();
  }, [load]);

  const pending = items.filter((i) => !i.purchased);
  const purchased = items.filter((i) => i.purchased);

  // Group pending by category
  const grouped = pending.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const handleToggle = async (id) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, purchased: i.purchased ? 0 : 1 } : i))
    );
    try {
      await toggleItem(id);
    } catch {
      load(); // rollback
    }
  };

  const handleDelete = async (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteItem(id);
  };

  const handleAdd = async (data) => {
    await addItem(data);
    setShowModal(false);
  };

  const handleClearPurchased = async () => {
    setItems((prev) => prev.filter((i) => !i.purchased));
    await clearPurchased();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        pendingCount={pending.length}
        onAddClick={() => setShowModal(true)}
      />

      <main className="max-w-2xl mx-auto px-3 pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-48 text-gray-400">
            Carregando...
          </div>
        ) : pending.length === 0 && purchased.length === 0 ? (
          <EmptyState onAddClick={() => setShowModal(true)} />
        ) : (
          <>
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <CategorySection
                key={category}
                category={category}
                items={categoryItems}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}

            {purchased.length > 0 && (
              <PurchasedSection
                items={purchased}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onClear={handleClearPurchased}
              />
            )}
          </>
        )}
      </main>

      {showModal && (
        <AddItemModal onAdd={handleAdd} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function EmptyState({ onAddClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <span className="text-6xl mb-4">🛒</span>
      <p className="text-gray-500 text-lg font-medium">Lista vazia</p>
      <p className="text-gray-400 text-sm mb-6">Adicione itens para começar</p>
      <button
        onClick={onAddClick}
        className="bg-indigo-500 text-white px-6 py-2.5 rounded-full font-medium shadow-md active:scale-95 transition-transform"
      >
        Adicionar item
      </button>
    </div>
  );
}
