import { useState } from 'react';
import ItemBlock from './ItemBlock';

export default function PurchasedSection({ items, onToggle, onDelete, onHold, onClear }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="mt-8 border-t-2 border-dashed border-gray-200 pt-5">
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          className="flex items-center gap-2 text-gray-400"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="text-sm font-bold uppercase tracking-wider">
            ✓ Comprados
          </span>
          <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-2 py-0.5">
            {items.length}
          </span>
          <span className="text-xs">{expanded ? '▲' : '▼'}</span>
        </button>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-400 font-medium active:opacity-60 transition-opacity"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item) => (
            <ItemBlock key={item.id} item={item} onToggle={onToggle} onHold={onHold} />
          ))}
        </div>
      )}
    </section>
  );
}
