import { getCategoryMeta } from '../categories';

export default function ItemActionSheet({ item, aisles, onMove, onDelete, onClose }) {
  const visibleAisles = aisles ? aisles.filter((a) => !a.hidden) : [];

  const handleMove = (aisleName) => {
    onMove(item.id, aisleName);
    onClose();
  };

  const handleDelete = () => {
    onDelete(item.id);
    onClose();
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

        <h2 className="text-lg font-extrabold text-gray-800 mb-1">
          Mover <span className="text-indigo-600">{item.name}</span>
        </h2>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">
          Selecione o corredor
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {visibleAisles.map((aisle) => {
            const isSelected = item.category === aisle.name;
            const meta = aisle.color
              ? aisle
              : getCategoryMeta(aisle.name);
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

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3.5 rounded-2xl font-extrabold text-sm active:scale-95 transition-transform"
            style={{ background: '#fef2f2', color: '#ef4444', border: '2px solid #fca5a5' }}
          >
            🗑️ Remover item
          </button>
        </div>
      </div>
    </div>
  );
}
