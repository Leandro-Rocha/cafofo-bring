import { useEffect, useState, useCallback } from 'react';
import { fetchItems, addItem, toggleItem, deleteItem, clearPurchased, socket, fetchAisles, changeItemCategory, renameItem, fetchWaStatus } from './api';
import { getCategoryMeta } from './categories';
import Header from './components/Header';
import CategorySection from './components/CategorySection';
import PurchasedSection from './components/PurchasedSection';
import AddItemModal from './components/AddItemModal';
import AisleManager from './components/AisleManager';
import ItemActionSheet from './components/ItemActionSheet';
import WhatsAppSetup from './components/WhatsAppSetup';

export default function App() {
  const [items, setItems] = useState([]);
  const [aisles, setAisles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAisleManager, setShowAisleManager] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [heldItem, setHeldItem] = useState(null);

  const loadAisles = useCallback(async () => {
    try {
      const data = await fetchAisles();
      setAisles(data);
    } catch {
      // keep whatever we have
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [itemsData] = await Promise.all([fetchItems(), loadAisles()]);
      setItems(itemsData);
    } finally {
      setLoading(false);
    }
  }, [loadAisles]);

  useEffect(() => {
    fetchWaStatus().then((s) => setWaStatus(s.status)).catch(() => {});
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

  // Build an aisle lookup map by name
  const aisleByName = aisles.reduce((acc, a) => { acc[a.name] = a; return acc; }, {});

  // Group pending by category, filtering out items in hidden aisles
  const hiddenNames = new Set(aisles.filter((a) => a.hidden).map((a) => a.name));

  const grouped = pending.reduce((acc, item) => {
    if (hiddenNames.has(item.category)) return acc;
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Sort categories by aisle position (unknown categories go to end)
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const posA = aisleByName[a]?.position ?? 9999;
    const posB = aisleByName[b]?.position ?? 9999;
    return posA - posB;
  });

  const handleToggle = async (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, purchased: i.purchased ? 0 : 1 } : i))
    );
    try {
      await toggleItem(id);
    } catch {
      load();
    }
  };

  const handleDelete = async (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteItem(id);
  };

  // Tap → open action sheet
  const handleTap = (id) => {
    setHeldItem(items.find((i) => i.id === id) || null);
  };

  // Hold → quick purchase toggle
  const handleHold = (id) => {
    handleToggle(id);
  };

  const handleRename = async (id, name) => {
    try {
      const updated = await renameItem(id, name);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch {
      load();
    }
  };

  const handleMove = async (id, category) => {
    setHeldItem(null);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
    try {
      await changeItemCategory(id, category);
    } catch {
      load();
    }
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
        onSettingsClick={() => setShowAisleManager(true)}
        onWhatsAppClick={() => setShowWhatsApp(true)}
        waStatus={waStatus}
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
            {sortedCategories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                items={grouped[category]}
                onTap={handleTap}
                onHold={handleHold}
                aisleMeta={aisleByName[category] || getCategoryMeta(category)}
              />
            ))}

            {purchased.length > 0 && (
              <PurchasedSection
                items={purchased}
                onTap={handleTap}
                onHold={handleHold}
                onClear={handleClearPurchased}
              />
            )}
          </>
        )}
      </main>

      {showModal && (
        <AddItemModal
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
          aisles={aisles.length > 0 ? aisles : null}
        />
      )}

      {showWhatsApp && (
        <WhatsAppSetup onClose={() => { setShowWhatsApp(false); fetchWaStatus().then((s) => setWaStatus(s.status)).catch(() => {}); }} />
      )}

      {showAisleManager && (
        <AisleManager
          aisles={aisles}
          onClose={() => setShowAisleManager(false)}
          onRefresh={loadAisles}
        />
      )}

      {heldItem && (
        <ItemActionSheet
          item={heldItem}
          aisles={aisles}
          onMove={handleMove}
          onToggle={(id) => { handleToggle(id); setHeldItem(null); }}
          onDelete={(id) => { handleDelete(id); setHeldItem(null); }}
          onRename={(id, name) => { handleRename(id, name); setHeldItem(null); }}
          onClose={() => setHeldItem(null)}
        />
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
