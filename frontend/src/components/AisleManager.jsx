import { useState, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reorderAisles, updateAisle, deleteAisle, createAisle } from '../api';

const COLOR_PALETTE = [
  { color: '#f43f5e', bg: '#fff1f2', border: '#fda4af' },
  { color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
  { color: '#0ea5e9', bg: '#f0f9ff', border: '#7dd3fc' },
  { color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  { color: '#ec4899', bg: '#fdf2f8', border: '#f9a8d4' },
  { color: '#6366f1', bg: '#eef2ff', border: '#a5b4fc' },
  { color: '#14b8a6', bg: '#f0fdfa', border: '#5eead4' },
];

function SortableAisleRow({ aisle, onToggleHidden, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(aisle.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: aisle.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== aisle.name) {
      onRename(aisle.id, trimmed);
    } else {
      setEditName(aisle.name);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') { setEditName(aisle.name); setEditing(false); }
  };

  if (confirmDelete) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, background: '#fef2f2', border: '2px solid #fca5a5' }}
        className="flex items-center gap-3 px-3 py-3 rounded-2xl"
      >
        <span className="text-2xl">🗑️</span>
        <span className="flex-1 text-sm text-red-600 font-medium">Remover "{aisle.name}"?</span>
        <button
          className="text-xs px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold active:scale-95 transition-transform"
          onClick={() => { onDelete(aisle.id); setConfirmDelete(false); }}
        >
          Sim
        </button>
        <button
          className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 font-bold active:scale-95 transition-transform"
          onClick={() => setConfirmDelete(false)}
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: aisle.hidden ? '#f9fafb' : aisle.bg, border: `2px solid ${aisle.hidden ? '#e5e7eb' : aisle.border}` }}
      className="flex items-center gap-3 px-3 py-3 rounded-2xl"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 text-xl cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        aria-label="Arrastar"
        style={{ touchAction: 'none' }}
      >
        ≡
      </button>

      {/* Emoji */}
      <span className="text-2xl flex-shrink-0" style={{ filter: aisle.hidden ? 'grayscale(1) opacity(0.4)' : 'none' }}>
        {aisle.emoji}
      </span>

      {/* Name (inline edit) */}
      {editing ? (
        <input
          autoFocus
          className="flex-1 text-sm font-bold rounded-xl px-2 py-1 border outline-none"
          style={{ borderColor: aisle.color, color: aisle.color }}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button
          className="flex-1 text-left text-sm font-bold truncate"
          style={{ color: aisle.hidden ? '#9ca3af' : aisle.color }}
          onClick={() => setEditing(true)}
        >
          {aisle.name}
        </button>
      )}

      {/* Eye toggle */}
      <button
        className="text-lg flex-shrink-0 active:scale-90 transition-transform"
        aria-label={aisle.hidden ? 'Mostrar corredor' : 'Ocultar corredor'}
        onClick={() => onToggleHidden(aisle.id, !aisle.hidden)}
        title={aisle.hidden ? 'Mostrar' : 'Ocultar'}
      >
        {aisle.hidden ? '🙈' : '👁️'}
      </button>

      {/* Delete */}
      {aisle.name !== 'Outros' && (
        <button
          className="text-lg flex-shrink-0 active:scale-90 transition-transform"
          aria-label="Remover corredor"
          onClick={() => setConfirmDelete(true)}
        >
          🗑️
        </button>
      )}
    </div>
  );
}

export default function AisleManager({ aisles, onClose, onRefresh }) {
  const [localAisles, setLocalAisles] = useState(aisles);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📦');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalAisles(aisles);
  }, [aisles]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localAisles.findIndex((a) => a.id === active.id);
    const newIndex = localAisles.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(localAisles, oldIndex, newIndex).map((a, i) => ({ ...a, position: i }));
    setLocalAisles(reordered);

    try {
      await reorderAisles(reordered.map((a) => ({ id: a.id, position: a.position })));
      onRefresh();
    } catch {
      setLocalAisles(aisles); // rollback
    }
  };

  const handleToggleHidden = async (id, hidden) => {
    setLocalAisles((prev) => prev.map((a) => (a.id === id ? { ...a, hidden: hidden ? 1 : 0 } : a)));
    try {
      await updateAisle(id, { hidden });
      onRefresh();
    } catch {
      setLocalAisles(aisles);
    }
  };

  const handleDelete = async (id) => {
    setLocalAisles((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAisle(id);
      onRefresh();
    } catch {
      setLocalAisles(aisles);
    }
  };

  const handleRename = async (id, name) => {
    setLocalAisles((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
    try {
      await updateAisle(id, { name });
      onRefresh();
    } catch {
      setLocalAisles(aisles);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    const paletteEntry = COLOR_PALETTE[localAisles.length % COLOR_PALETTE.length];
    try {
      await createAisle({
        name: newName.trim(),
        emoji: newEmoji,
        ...paletteEntry,
      });
      setNewName('');
      setNewEmoji('📦');
      setShowNewForm(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'white' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.25)',
        }}
      >
        <div>
          <h2 className="text-white text-lg font-extrabold tracking-tight">Corredores</h2>
          <p className="text-indigo-200 text-xs mt-0.5">Arraste para ordenar conforme seu mercado</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-light text-white active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)' }}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localAisles.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {localAisles.map((aisle) => (
                <SortableAisleRow
                  key={aisle.id}
                  aisle={aisle}
                  onToggleHidden={handleToggleHidden}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* New aisle form */}
        {showNewForm ? (
          <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 p-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Novo corredor</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="w-14 text-center text-2xl rounded-xl border border-indigo-200 bg-white py-2 outline-none"
                maxLength={4}
                placeholder="📦"
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do corredor"
                className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newName.trim() || saving}
                className="flex-1 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              >
                {saving ? 'Criando...' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewForm(false); setNewName(''); setNewEmoji('📦'); }}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-bold active:scale-95 transition-transform"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-4 w-full py-3 rounded-2xl text-sm font-bold text-indigo-500 border-2 border-dashed border-indigo-200 active:scale-95 transition-transform"
            style={{ background: '#f5f3ff' }}
          >
            + Novo corredor
          </button>
        )}
      </div>
    </div>
  );
}
