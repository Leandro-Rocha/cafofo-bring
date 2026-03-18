export default function Header({ pendingCount, onAddClick, onSettingsClick, onWhatsAppClick, waStatus }) {
  const waDot = {
    connected: 'bg-green-400',
    connecting: 'bg-yellow-400',
    disconnected: 'bg-gray-400',
  }[waStatus] || 'bg-gray-400';

  return (
    <header
      className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between"
      style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)',
        boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
      }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onSettingsClick}
          aria-label="Gerenciar corredores"
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)' }}
        >
          ⚙️
        </button>
        <button
          onClick={onWhatsAppClick}
          aria-label="WhatsApp"
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-xl shadow active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)' }}
        >
          💬
          <span className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${waDot}`} />
        </button>
      </div>

      <div className="text-center flex-1 mx-2">
        <h1 className="text-white text-xl font-bold tracking-tight drop-shadow">
          🛒 Cafofo Bring
        </h1>
        <p className="text-indigo-200 text-xs mt-0.5 font-medium">
          {pendingCount === 0
            ? 'Tudo comprado! 🎉'
            : `${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'} na lista`}
        </p>
      </div>

      <button
        onClick={onAddClick}
        aria-label="Adicionar item"
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-light shadow-xl active:scale-90 transition-transform"
        style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)' }}
      >
        +
      </button>
    </header>
  );
}
