import { useRef, useState } from 'react';
import { getCategoryMeta } from '../categories';

export default function ItemBlock({ item, onToggle, onDelete }) {
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef(null);
  const didHold = useRef(false);
  const meta = getCategoryMeta(item.category);

  const startHold = () => {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      setHolding(true);
    }, 500);
  };

  const endHold = () => {
    clearTimeout(holdTimer.current);
    if (!didHold.current) onToggle(item.id);
  };

  const cancel = () => {
    clearTimeout(holdTimer.current);
    didHold.current = false;
  };

  if (holding) {
    return (
      <div
        className="item-card relative rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer select-none border-2"
        style={{ background: '#fef2f2', borderColor: '#fca5a5', minHeight: 90 }}
        onClick={() => setHolding(false)}
      >
        <button
          className="absolute top-1 right-1 text-red-400 text-lg leading-none p-1"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          aria-label="Remover"
        >
          ✕
        </button>
        <span className="text-2xl mb-1">🗑️</span>
        <span className="text-xs text-red-400 font-medium">Remover?</span>
      </div>
    );
  }

  return (
    <div
      className="item-card rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer select-none shadow-sm border"
      style={{
        background: item.purchased ? '#f9fafb' : meta.bg,
        borderColor: item.purchased ? '#e5e7eb' : meta.border,
        minHeight: 90,
        opacity: item.purchased ? 0.55 : 1,
      }}
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={cancel}
      onTouchStart={(e) => { e.preventDefault(); startHold(); }}
      onTouchEnd={(e) => { e.preventDefault(); endHold(); }}
      onTouchCancel={cancel}
    >
      <span className="text-2xl mb-1" style={{ filter: item.purchased ? 'grayscale(1)' : 'none' }}>
        {meta.emoji}
      </span>
      <span
        className="text-xs font-semibold leading-tight"
        style={{
          color: item.purchased ? '#9ca3af' : meta.color,
          textDecoration: item.purchased ? 'line-through' : 'none',
        }}
      >
        {item.name}
      </span>
      {item.quantity && (
        <span className="text-xs text-gray-400 mt-0.5">{item.quantity}</span>
      )}
    </div>
  );
}
