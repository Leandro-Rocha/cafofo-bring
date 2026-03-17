export default function Header({ pendingCount, onAddClick }) {
  return (
    <header
      className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between shadow-md"
      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
    >
      <div>
        <h1 className="text-white text-xl font-bold tracking-tight">🛒 Cafofo Bring</h1>
        <p className="text-indigo-200 text-xs mt-0.5">
          {pendingCount === 0
            ? 'Nada para comprar'
            : `${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'} na lista`}
        </p>
      </div>
      <button
        onClick={onAddClick}
        className="bg-white text-indigo-600 w-11 h-11 rounded-full flex items-center justify-center text-2xl font-light shadow-lg active:scale-90 transition-transform"
        aria-label="Adicionar item"
      >
        +
      </button>
    </header>
  );
}
