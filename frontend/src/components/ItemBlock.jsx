import { useRef, useState } from 'react';
import { getCategoryMeta } from '../categories';

// Module-level flag: survives component unmount when item moves to purchased list
let holdJustFired = false;

export default function ItemBlock({ item, onTap, onHold, aisleMeta }) {
  const holdTimer = useRef(null);
  const didHold = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const meta = aisleMeta || getCategoryMeta(item.category);
  const emoji = item.emoji || meta.emoji;

  const [showCheck, setShowCheck] = useState(false);

  const startHold = (e) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      holdJustFired = true;
      if (!item.purchased) {
        setShowCheck(true);
        setTimeout(() => onHold?.(item.id), 350);
      } else {
        onHold?.(item.id);
      }
    }, 500);
  };

  // Movement only cancels the hold timer — does NOT prevent the tap.
  // pointerCancel (browser scroll takeover) is what prevents the tap.
  const moveHold = (e) => {
    if (didHold.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 12) {
      clearTimeout(holdTimer.current);
    }
  };

  // pointerUp = finger lifted intentionally → fire tap if no hold
  const endHold = () => {
    clearTimeout(holdTimer.current);
    const suppressed = holdJustFired;
    holdJustFired = false;
    if (!didHold.current && !suppressed) onTap?.(item.id);
  };

  // pointerCancel = browser took over (scroll) → no tap, no hold
  const cancel = () => {
    clearTimeout(holdTimer.current);
    didHold.current = false;
  };

  return (
    <div
      className="item-card item-enter relative rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer select-none overflow-hidden"
      style={{
        background: item.purchased ? 'rgba(255,255,255,0.5)' : 'white',
        border: `2px solid ${item.purchased ? '#e5e7eb' : meta.border}`,
        minHeight: 100,
        opacity: item.purchased ? 0.5 : 1,
        boxShadow: item.purchased ? 'none' : '0 2px 16px rgba(0,0,0,0.07)',
        touchAction: 'pan-y',
      }}
      onPointerDown={startHold}
      onPointerMove={moveHold}
      onPointerUp={endHold}
      onPointerCancel={cancel}
    >
      {showCheck && <div className="check-overlay">✓</div>}

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
