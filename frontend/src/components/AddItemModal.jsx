import { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '../categories';

export default function AddItemModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Outros');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), category, quantity: quantity.trim() || undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 z-10">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <h2 className="text-lg font-bold text-gray-800 mb-4">Adicionar item</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Nome *
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Leite, Pão, Frango..."
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Categoria
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor: category === cat.name ? cat.color : '#e5e7eb',
                    background: category === cat.name ? cat.bg : 'white',
                    color: category === cat.name ? cat.color : '#6b7280',
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span className="truncate">{cat.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Quantidade (opcional)
            </label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ex: 2 litros, 500g..."
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base mt-1 transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {submitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
      </div>
    </div>
  );
}
