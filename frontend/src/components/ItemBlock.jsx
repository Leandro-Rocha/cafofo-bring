import { useRef } from 'react';
import { getCategoryMeta } from '../categories';

// Module-level flag: survives component unmount caused by list reorder after hold
let holdJustFired = false;

export default function ItemBlock({ item, onTap, onHold, aisleMeta }) {
  const holdTimer = useRef(null);
  const didHold = useRef(false);
  const meta = aisleMeta || getCategoryMeta(item.category);
  const emoji = item.emoji || meta.emoji;

  const startHold = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      holdJustFired = true;
      onHold?.(item.id);
    }, 500);
  };

  const endHold = () => {
    clearTimeout(holdTimer.current);
    const suppressed = holdJustFired;
    holdJustFired = false;
    if (!didHold.current && !suppressed) onTap?.(item.id);
  };

  const cancel = () => {
    clearTimeout(holdTimer.current);
    didHold.current = false;
  };

  return (
    <div
      className="item-card item-enter rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer select-none overflow-hidden"
      style={{
        background: item.purchased ? 'rgba(255,255,255,0.5)' : 'white',
        border: `2px solid ${item.purchased ? '#e5e7eb' : meta.border}`,
        minHeight: 100,
        opacity: item.purchased ? 0.5 : 1,
        boxShadow: item.purchased ? 'none' : '0 2px 16px rgba(0,0,0,0.07)',
        touchAction: 'none',
      }}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerCancel={cancel}
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
