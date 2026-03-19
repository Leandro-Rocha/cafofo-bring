import { useState, useRef, useEffect } from 'react';
import { getCategoryMeta } from '../categories';

export default function ItemActionSheet({ item, aisles, onMove, onDelete, onToggle, onRename, onClose }) {
  const [editing, setEditing] = useState(false);
  const mountedAt = useRef(Date.now());
  const safeClose = () => { if (Date.now() - mountedAt.current > 200) onClose(); };

  useEffect(() => {
    history.pushState({ modal: 'item' }, '');
    const handlePop = () => onClose();
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      if (history.state?.modal === 'item') history.back();
    };
  }, []);
  const [nameVal, setNameVal] = useState(item.name);
  const [quantityVal, setQuantityVal] = useState(item.quantity || '');
  const visibleAisles = aisles ? aisles.filter((a) => !a.hidden) : [];

  const handleMove = (aisleName) => {
    onMove(item.id, aisleName);
    onClose();
  };

  const handleDelete = () => {
    onDelete(item.id);
    onClose();
  };

  const handleToggle = () => {
    onToggle(item.id);
    onClose();
  };

  const handleRename = () => {
    const trimmed = nameVal.trim();
    if (trimmed) onRename(item.id, trimmed, quantityVal.trim() || null);
    onClose();
  };

  const cancelEdit = () => {
    setEditing(false);
    setNameVal(item.name);
    setQuantityVal(item.quantity || '');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && safeClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={safeClose} />

      <div
        className="sheet-enter relative w-full rounded-t-3xl px-5 pt-4 pb-10 z-10"
        style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* Header with inline edit */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl leading-none">{item.emoji || '🛒'}</span>
          {editing ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="flex-1 text-lg font-extrabold text-gray-800 border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5"
            />
          ) : (
            <h2 className="flex-1 text-lg font-extrabold text-gray-800 leading-tight">{item.name}</h2>
          )}
          <button
            onClick={() => editing ? cancelEdit() : setEditing(true)}
            className="text-xl px-2.5 py-1.5 rounded-xl active:scale-90 transition-transform"
            style={{ background: editing ? '#eef2ff' : '#f3f4f6', color: editing ? '#4f46e5' : '#9ca3af' }}
          >
            {editing ? '✕' : '✏️'}
          </button>
        </div>

        {editing ? (
          /* Edit mode */
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Observações</label>
              <input
                value={quantityVal}
                onChange={(e) => setQuantityVal(e.target.value)}
                placeholder="ex: 2 litros, sem lactose, marca X..."
                className="mt-1 w-full border border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex-1 py-3.5 rounded-2xl font-extrabold text-sm text-gray-500 bg-gray-100 active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button
                onClick={handleRename}
                disabled={!nameVal.trim()}
                className="flex-1 py-3.5 rounded-2xl font-extrabold text-sm text-white active:scale-95 transition-transform disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Toggle purchased */}
            <button
              type="button"
              onClick={handleToggle}
              className="w-full py-3.5 rounded-2xl font-extrabold text-sm active:scale-95 transition-transform mb-4"
              style={item.purchased
                ? { background: '#f9fafb', color: '#6b7280', border: '2px solid #e5e7eb' }
                : { background: '#f0fdf4', color: '#16a34a', border: '2px solid #86efac' }
              }
            >
              {item.purchased ? '↩️ Desmarcar' : '✅ Marcar como comprado'}
            </button>

            {/* Aisle grid — only for pending items */}
            {!item.purchased && visibleAisles.length > 0 && (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Mover para corredor</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {visibleAisles.map((aisle) => {
                    const isSelected = item.category === aisle.name;
                    const meta = aisle.color ? aisle : getCategoryMeta(aisle.name);
                    return (
                      <button
                        key={aisle.name}
                        type="button"
                        onClick={() => handleMove(aisle.name)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-95"
                        style={{
                          background: isSelected ? meta.bg : '#f9fafb',
                          border: `2px solid ${isSelected ? meta.color : '#f3f4f6'}`,
                          color: isSelected ? meta.color : '#6b7280',
                          boxShadow: isSelected ? `0 2px 12px ${meta.color}33` : 'none',
                        }}
                      >
                        <span className="text-2xl">{meta.emoji}</span>
                        <span className="text-xs font-bold leading-tight">{aisle.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-3.5 rounded-2xl font-extrabold text-sm active:scale-95 transition-transform"
              style={{ background: '#fef2f2', color: '#ef4444', border: '2px solid #fca5a5' }}
            >
              🗑️ Remover item
            </button>
          </>
        )}
      </div>
    </div>
  );
}
