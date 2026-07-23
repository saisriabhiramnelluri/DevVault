'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { commandsApi, Command } from '@/lib/api';
import { Plus, Search, Edit, Trash2, X, Loader2, Terminal, Copy, Check } from 'lucide-react';

function CommandModal({ projectId, editing, onSave, onClose }: {
  projectId: string; editing: Command | null; onSave: (c: Command) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(editing?.title || '');
  const [command, setCommand] = useState(editing?.command || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      let saved: Command;
      if (editing) {
        const { command: cmd } = await commandsApi.update(projectId, editing.id, { title, command, description });
        saved = cmd;
      } else {
        const { command: cmd } = await commandsApi.create(projectId, { title, command, description });
        saved = cmd;
      }
      onSave(saved); onClose();
    } catch { setError('Failed to save command.'); setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{editing ? 'Edit Command' : 'Add Command'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="label">Title *</label>
            <input type="text" className="input" placeholder="e.g. Start Dev Server" value={title}
              onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label">Command *</label>
            <input type="text" className="input mono" placeholder="npm run dev"
              value={command} onChange={(e) => setCommand(e.target.value)}
              required style={{ fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input type="text" className="input" placeholder="What does this command do?" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
              {loading ? 'Saving...' : 'Save Command'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommandCard({ cmd, onEdit, onDelete }: {
  cmd: Command; onEdit: (c: Command) => void; onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cmd.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Terminal size={16} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{cmd.title}</p>
          {cmd.description && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{cmd.description}</p>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
          }}>
            <code style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cmd.command}
            </code>
            <button className="btn-icon" style={{ padding: 3, flexShrink: 0 }} onClick={handleCopy}>
              {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={() => onEdit(cmd)}><Edit size={14} /></button>
          <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => onDelete(cmd.id)}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

export default function CommandsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Command | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCommands = useCallback(() => {
    commandsApi.list(projectId).then(({ commands }) => {
      setCommands(commands); setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchCommands(); }, [fetchCommands]);

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.command.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    await commandsApi.delete(projectId, id);
    setCommands((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '1 1 200px', maxWidth: 320 }}>
            <Search size={14} className="search-icon" />
            <input className="input" placeholder="Search commands..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={14} /> Add Command
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={20} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--primary)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Terminal size={40} style={{ color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              {search ? 'No commands match your search' : 'No commands yet'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Save frequently used commands for this project
            </p>
            {!search && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={14} /> Add Command
              </button>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((cmd) => (
              <CommandCard
                key={cmd.id}
                cmd={cmd}
                onEdit={(c) => { setEditing(c); setShowModal(true); }}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CommandModal
          projectId={projectId}
          editing={editing}
          onSave={(c) => {
            if (editing) setCommands((prev) => prev.map((x) => x.id === c.id ? c : x));
            else setCommands((prev) => [...prev, c]);
            setEditing(null);
          }}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Delete Command?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>This will permanently remove the command.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
