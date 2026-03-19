import { useState, useEffect } from 'react';
import { fetchWaStatus, fetchWaGroups, setWaGroup, setWaInterval, setWaGroqKey } from '../api';

export default function WhatsAppSetup({ onClose }) {
  const [status, setStatus] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [intervalVal, setIntervalVal] = useState(10);
  const [saved, setSaved] = useState(false);
  const [groqKey, setGroqKey] = useState('');
  const [groqSaved, setGroqSaved] = useState(false);

  useEffect(() => {
    fetchWaStatus()
      .then((s) => { setStatus(s); setIntervalVal(s.intervalMinutes); })
      .catch(() => {});
  }, []);

  const handleLoadGroups = async () => {
    setLoadingGroups(true);
    const g = await fetchWaGroups();
    setGroups(g);
    setLoadingGroups(false);
  };

  const handleSelectGroup = async (group) => {
    await setWaGroup(group.id, group.name);
    setGroups([]);
    setStatus((prev) => ({ ...prev, groupId: group.id, groupName: group.name, hasGroup: true }));
  };

  const handleSaveInterval = async () => {
    await setWaInterval(intervalVal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveGroqKey = async () => {
    await setWaGroqKey(groqKey.trim());
    setGroqKey('');
    setGroqSaved(true);
    setTimeout(() => setGroqSaved(false), 2000);
  };

  const zapStatus = status?.status;
  const statusStyle = {
    connected: 'bg-green-100 text-green-700',
    connecting: 'bg-yellow-100 text-yellow-700',
    disconnected: 'bg-gray-100 text-gray-500',
  }[zapStatus] || 'bg-gray-100 text-gray-500';
  const statusLabel = { connected: 'Conectado', connecting: 'Aguardando QR', disconnected: 'Desconectado' }[zapStatus] || 'Desconectado';

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="sheet-enter relative w-full rounded-t-3xl px-5 pt-4 pb-10 z-10"
        style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">💬</span>
          <h2 className="text-lg font-extrabold text-gray-800">WhatsApp</h2>
          {status && (
            <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle}`}>
              {statusLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-5">
          via{' '}
          <a href="http://192.168.0.220:3010" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
            cafofo-zap
          </a>
        </p>

        {!status && <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>}

        {status && (
          <div className="flex flex-col gap-4">

            {/* Group picker list */}
            {groups.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecionar grupo</p>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGroup(g)}
                    className="w-full py-3 px-4 rounded-2xl text-left font-semibold text-gray-700 bg-gray-50 border border-gray-200 active:scale-95 transition-transform"
                  >
                    💬 {g.name}
                  </button>
                ))}
                <button onClick={() => setGroups([])} className="text-xs text-gray-400 mt-1">
                  Cancelar
                </button>
              </div>
            )}

            {groups.length === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border"
                style={{ background: status.groupName ? '#f0fdf4' : '#fffbeb', borderColor: status.groupName ? '#86efac' : '#fcd34d' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-0.5">Grupo da lista</p>
                  <p className="font-bold text-gray-800 truncate">{status.groupName ? `💬 ${status.groupName}` : 'Não configurado'}</p>
                </div>
                <button
                  onClick={handleLoadGroups}
                  disabled={loadingGroups}
                  className="px-3 py-2 rounded-xl font-bold text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 active:scale-95 transition-transform disabled:opacity-40 flex-shrink-0"
                >
                  {loadingGroups ? '...' : 'Trocar'}
                </button>
              </div>
            )}

            {/* Interval */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Intervalo do resumo
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="1" max="120" value={intervalVal}
                  onChange={(e) => setIntervalVal(parseInt(e.target.value) || 10)}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-center font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <span className="text-sm text-gray-500 flex-1">minutos</span>
                <button
                  onClick={handleSaveInterval}
                  className="px-5 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
                  style={{ background: saved ? '#22c55e' : '#4f46e5', color: 'white' }}
                >
                  {saved ? 'Salvo ✓' : 'Salvar'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                O resumo é enviado após {intervalVal} min sem novas atividades na lista.
              </p>
            </div>

            {/* Groq API key */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Groq API Key {status.hasGroqKey && <span className="text-green-500 normal-case font-normal">✓ configurada</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="password" value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder={status.hasGroqKey ? '••••••••••••••••' : 'gsk_...'}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
                />
                <button
                  onClick={handleSaveGroqKey}
                  disabled={!groqKey.trim()}
                  className="px-5 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: groqSaved ? '#22c55e' : '#4f46e5', color: 'white' }}
                >
                  {groqSaved ? '✓' : 'Salvar'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Necessária para parsear áudios em itens. Grátis em console.groq.com
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
