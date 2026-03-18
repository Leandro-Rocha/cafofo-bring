import { useRef, useState } from 'react';
import { getCategoryMeta } from '../categories';

export default function ItemBlock({ item, onToggle, onDelete }) {
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef(null);
  const didHold = useRef(false);
  const meta = getCategoryMeta(item.category);
  const emoji = item.emoji || meta.emoji;

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
        className="item-card item-enter relative rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer select-none"
        style={{ background: '#fef2f2', border: '2px solid #fca5a5', minHeight: 100 }}
        onClick={() => setHolding(false)}
      >
        <button
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-100 text-red-400 text-xs flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        >✕</button>
        <span className="text-3xl mb-1">🗑️</span>
        <span className="text-xs text-red-400 font-bold">Remover?</span>
      </div>
    );
  }

  return (
    <div
      className="item-card item-enter rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer select-none overflow-hidden"
      style={{
        background: item.purchased ? 'rgba(255,255,255,0.5)' : 'white',
        border: `2px solid ${item.purchased ? '#e5e7eb' : meta.border}`,
        minHeight: 100,
        opacity: item.purchased ? 0.5 : 1,
        boxShadow: item.purchased ? 'none' : '0 2px 16px rgba(0,0,0,0.07)',
      }}
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={cancel}
      onTouchStart={(e) => { e.preventDefault(); startHold(); }}
      onTouchEnd={(e) => { e.preventDefault(); endHold(); }}
      onTouchCancel={cancel}
    >
      {/* Color accent bar */}
      {!item.purchased && (
        <div className="w-full h-1.5 rounded-t-lg" style={{ background: meta.color }} />
      )}

      <div className="flex flex-col items-center justify-center flex-1 px-2 py-2">
        <span
          className="text-3xl mb-1.5 leading-none"
          style={{ filter: item.purchased ? 'grayscale(1)' : 'none' }}
        >
          {emoji}
        </span>
        <span
          className="text-xs font-bold leading-tight text-center"
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
    </div>
  );
}
