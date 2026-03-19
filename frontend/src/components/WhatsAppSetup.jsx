import { useState, useEffect, useRef } from 'react';
import { fetchWaStatus, fetchWaGroups, setWaGroup, setWaInterval, disconnectWa, setWaGroqKey } from '../api';

export default function WhatsAppSetup({ onClose }) {
  const [status, setStatus] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [intervalVal, setIntervalVal] = useState(10);
  const [saved, setSaved] = useState(false);
  const [groqKey, setGroqKey] = useState('');
  const [groqSaved, setGroqSaved] = useState(false);
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const s = await fetchWaStatus();
      setStatus(s);
      setIntervalVal(s.intervalMinutes);
      return s;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const poll = async () => {
      const s = await load();
      // Keep polling while connecting (QR may refresh every ~20s)
      if (s?.status === 'connecting' || s?.status === 'disconnected') {
        pollRef.current = setTimeout(poll, 4000);
      }
    };
    poll();
    return () => clearTimeout(pollRef.current);
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
    await load();
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
    await load();
  };

  const handleDisconnect = async () => {
    await disconnectWa();
    setGroups([]);
    // After disconnect, start polling again for new QR
    const poll = async () => {
      const s = await load();
      if (s?.status !== 'connected') {
        pollRef.current = setTimeout(poll, 4000);
      }
    };
    poll();
  };

  const statusLabel = {
    connected: 'Conectado',
    connecting: 'Aguardando QR',
    disconnected: 'Desconectado',
  };

  const statusStyle = {
    connected: 'bg-green-100 text-green-700',
    connecting: 'bg-yellow-100 text-yellow-700',
    disconnected: 'bg-gray-100 text-gray-500',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="sheet-enter relative w-full rounded-t-3xl px-5 pt-4 pb-10 z-10"
        style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">💬</span>
          <h2 className="text-lg font-extrabold text-gray-800">WhatsApp</h2>
          {status && (
            <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle[status.status] || statusStyle.disconnected}`}>
              {statusLabel[status.status] || 'Desconectado'}
            </span>
          )}
        </div>

        {!status && (
          <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
        )}

        {/* QR Code */}
        {status?.status === 'connecting' && (
          <div className="flex flex-col items-center gap-3 mb-4">
            <p className="text-sm text-gray-600 text-center">
              Abra o WhatsApp → <strong>Dispositivos vinculados</strong> → <strong>Vincular dispositivo</strong> e escaneie:
            </p>
            {status.qr ? (
              <img
                src={status.qr}
                alt="QR Code WhatsApp"
                className="w-60 h-60 rounded-2xl border-4 border-green-100"
              />
            ) : (
              <div className="w-60 h-60 rounded-2xl border-4 border-gray-100 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                Gerando QR...
              </div>
            )}
            <p className="text-xs text-gray-400">O QR é atualizado automaticamente a cada ~20s</p>
          </div>
        )}

        {/* Connected state */}
        {status?.status === 'connected' && (
          <div className="flex flex-col gap-4">

            {/* Active group */}
            {status.groupName ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Grupo ativo</p>
                <p className="font-bold text-gray-800">💬 {status.groupName}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-700 font-semibold">Nenhum grupo selecionado ainda. Escolha abaixo:</p>
              </div>
            )}

            {/* Group picker */}
            {groups.length === 0 ? (
              <button
                onClick={handleLoadGroups}
                disabled={loadingGroups}
                className="w-full py-3 rounded-2xl font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 active:scale-95 transition-transform disabled:opacity-40"
              >
                {loadingGroups ? 'Carregando grupos...' : status.groupName ? 'Trocar grupo' : 'Escolher grupo'}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecione o grupo</p>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGroup(g)}
                    className="w-full py-3 px-4 rounded-2xl text-left font-semibold text-gray-700 bg-gray-50 border border-gray-200 active:scale-95 transition-transform"
                  >
                    💬 {g.name}
                  </button>
                ))}
                <button
                  onClick={() => setGroups([])}
                  className="text-xs text-gray-400 mt-1"
                >
                  Cancelar
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
                  type="number"
                  min="1"
                  max="120"
                  value={intervalVal}
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
                  type="password"
                  value={groqKey}
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
                Necessária para transcrever áudios. Grátis em console.groq.com
              </p>
            </div>

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              className="w-full py-3 rounded-2xl font-bold text-red-500 bg-red-50 border border-red-100 active:scale-95 transition-transform"
            >
              Desconectar
            </button>
          </div>
        )}

        {/* Disconnected with no QR (e.g. just logged out) */}
        {status?.status === 'disconnected' && !status.qr && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-5xl">📵</span>
            <p className="text-gray-500 text-sm">Aguardando conexão...</p>
            <p className="text-gray-400 text-xs">O QR vai aparecer em instantes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
