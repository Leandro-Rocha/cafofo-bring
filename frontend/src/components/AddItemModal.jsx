import { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '../categories';
import { detectEmoji } from '../itemEmojis';

export default function AddItemModal({ onAdd, onClose, aisles }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Outros');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Use server aisles if provided, filtering out hidden ones; fall back to hardcoded categories
  const visibleCategories = aisles
    ? aisles.filter((a) => !a.hidden)
    : CATEGORIES;

  const detectedEmoji = detectEmoji(name);
  const selected = visibleCategories.find((c) => c.name === category)
    || visibleCategories[visibleCategories.length - 1]
    || CATEGORIES[CATEGORIES.length - 1];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        category,
        quantity: quantity.trim() || undefined,
        emoji: detectedEmoji || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="sheet-enter relative w-full rounded-t-3xl px-5 pt-4 pb-8 z-10"
        style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-extrabold text-gray-800 mb-4">Adicionar item</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Nome + emoji preview */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome *</label>
            <div className="flex items-center gap-3 mt-1">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-all"
                style={{ background: selected?.bg || '#f3f4f6', border: `2px solid ${selected?.border || '#e5e7eb'}` }}
              >
                {detectedEmoji || selected?.emoji || '🛒'}
              </div>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Leite, Pão, Frango..."
                className="flex-1 rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-2 border"
                style={{ borderColor: selected?.border, background: selected?.bg }}
              />
            </div>
            {detectedEmoji && (
              <p className="text-xs text-gray-400 mt-1 pl-1">
                Emoji detectado automaticamente {detectedEmoji}
              </p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {visibleCategories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-95"
                    style={{
                      background: isSelected ? cat.bg : '#f9fafb',
                      border: `2px solid ${isSelected ? cat.color : '#f3f4f6'}`,
                      color: isSelected ? cat.color : '#6b7280',
                      boxShadow: isSelected ? `0 2px 12px ${cat.color}33` : 'none',
                    }}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="text-xs font-bold leading-tight">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quantidade (opcional)</label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ex: 2 litros, 500g..."
              className="mt-1 w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-base mt-1 active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)' }}
          >
            {submitting ? 'Adicionando...' : '+ Adicionar'}
          </button>
        </form>
      </div>
    </div>
  );
}
