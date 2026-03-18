import { getCategoryMeta } from '../categories';
import ItemBlock from './ItemBlock';

export default function CategorySection({ category, items, onToggle, onDelete, aisleMeta }) {
  const meta = aisleMeta || getCategoryMeta(category);

  return (
    <section className="mt-5">
      <div
        className="flex items-center gap-2 mb-3 px-3 py-2 rounded-2xl"
        style={{ background: meta.bg, border: `1.5px solid ${meta.border}` }}
      >
        <span className="text-xl">{meta.emoji}</span>
        <h2 className="text-sm font-extrabold uppercase tracking-widest flex-1" style={{ color: meta.color }}>
          {category}
        </h2>
        <span
          className="text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
          style={{ background: meta.color, color: 'white' }}
        >
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <ItemBlock key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} aisleMeta={meta} />
        ))}
      </div>
    </section>
  );
}
