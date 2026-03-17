import { getCategoryMeta } from '../categories';
import ItemBlock from './ItemBlock';

export default function CategorySection({ category, items, onToggle, onDelete }) {
  const meta = getCategoryMeta(category);

  return (
    <section className="mt-5">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-base">{meta.emoji}</span>
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: meta.color }}>
          {category}
        </h2>
        <span
          className="text-xs font-semibold rounded-full px-2 py-0.5"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
        >
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <ItemBlock key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
