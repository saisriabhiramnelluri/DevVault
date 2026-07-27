'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { diaryApi, DiaryEntry } from '@/lib/api';
import { useToast } from '@/components/Toast';
import {
  Plus, Search, Edit, Trash2, X, Loader2, BookOpen, Pin, PinOff, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/dateUtils';

// ── Add / Edit Diary Entry Modal ──────────────────────────────────────────────
function DiaryModal({
  projectId, editing, onSave, onClose,
}: {
  projectId: string;
  editing: DiaryEntry | null;
  onSave: (entry: DiaryEntry) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(editing?.title || '');
  const [content, setContent] = useState(editing?.content || '');
  const [pinned, setPinned] = useState(editing?.pinned || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!content.trim()) { setError('Content is required'); return; }
    setLoading(true);
    setError('');
    try {
      let saved: DiaryEntry;
      if (editing) {
        const { entry } = await diaryApi.update(projectId, editing.id, { title: title.trim(), content: content.trim(), pinned });
        saved = entry;
      } else {
        const { entry } = await diaryApi.create(projectId, { title: title.trim(), content: content.trim(), pinned });
        saved = entry;
      }
      onSave(saved);
      onClose();
    } catch {
      setError('Failed to save diary entry.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            {editing ? 'Edit Entry' : 'New Diary Entry'}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="label">Title *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. API integration notes, deployment steps, bug fixes..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Content *</label>
            <textarea
              className="input"
              placeholder="Write your documentation, notes, or important details here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
              maxLength={10000}
              style={{ resize: 'vertical', lineHeight: 1.7 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', display: 'block', marginTop: 4 }}>
              {content.length.toLocaleString()} / 10,000
            </span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                background: pinned ? 'var(--warning-bg)' : 'var(--surface)',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--warning)' }}
              />
              <Pin size={14} style={{ color: pinned ? 'var(--warning)' : 'var(--text-muted)' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: pinned ? 'var(--warning)' : 'var(--text-secondary)' }}>
                Pin this entry to the top
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
              {loading ? 'Saving...' : editing ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Diary Entry Card ──────────────────────────────────────────────────────────
function DiaryCard({
  entry, onEdit, onDelete, onTogglePin,
}: {
  entry: DiaryEntry;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = entry.content.length > 200;
  const displayContent = expanded || !isLong ? entry.content : entry.content.slice(0, 200) + '...';

  return (
    <div
      className="card"
      style={{
        padding: '20px 24px',
        borderLeft: entry.pinned ? '3px solid var(--warning)' : '3px solid transparent',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: entry.pinned ? 'var(--warning-bg)' : 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {entry.pinned
            ? <Pin size={16} style={{ color: 'var(--warning)' }} />
            : <BookOpen size={16} style={{ color: 'var(--text-secondary)' }} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
              {entry.title}
            </p>
            {entry.pinned && (
              <span className="badge badge-yellow" style={{ fontSize: 10 }}>Pinned</span>
            )}
          </div>

          <div style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {displayContent}
          </div>

          {isLong && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8, padding: '3px 8px', fontSize: 12 }}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Clock size={11} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Updated {formatDistanceToNow(entry.updatedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="btn-icon"
            onClick={() => onTogglePin(entry)}
            title={entry.pinned ? 'Unpin' : 'Pin'}
          >
            {entry.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button className="btn-icon" onClick={() => onEdit(entry)} title="Edit">
            <Edit size={14} />
          </button>
          <button
            className="btn-icon"
            style={{ color: 'var(--danger)' }}
            onClick={() => onDelete(entry.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DiaryPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchEntries = useCallback(() => {
    diaryApi.list(projectId).then(({ entries }) => {
      setEntries(entries);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await diaryApi.delete(projectId, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDeleteId(null);
      toast.success('Diary entry deleted');
    } catch {
      toast.error('Failed to delete diary entry');
      setDeleteId(null);
    }
  };

  const handleTogglePin = async (entry: DiaryEntry) => {
    try {
      const { entry: updated } = await diaryApi.update(projectId, entry.id, { pinned: !entry.pinned });
      setEntries((prev) => {
        const updated_list = prev.map((e) => e.id === updated.id ? updated : e);
        // Re-sort: pinned first, then by updated date
        return updated_list.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      });
      toast.success(entry.pinned ? 'Entry unpinned' : 'Entry pinned');
    } catch {
      toast.error('Failed to update entry');
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Header bar */}
      <div style={{ padding: '20px 48px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', width: '100%' }}>
        <div className="page-container" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: '1 1 240px', maxWidth: 400 }}>
            <Search size={14} className="search-icon" />
            <input
              className="input"
              placeholder="Search diary entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={14} /> New Entry
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="page-container">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={20} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--primary)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--primary-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <BookOpen size={28} style={{ color: 'var(--primary-text)' }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>
                {search ? 'No entries match your search' : 'No diary entries yet'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.6 }}>
                {search
                  ? 'Try a different search term'
                  : 'Keep track of important documentation, deployment steps, API notes, and things you don\'t want to forget.'
                }
              </p>
              {!search && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 8 }}
                  onClick={() => setShowModal(true)}
                >
                  <Plus size={14} /> Create First Entry
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
                {search && ` matching "${search}"`}
              </p>
              {filtered.map((entry) => (
                <DiaryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={(e) => { setEditing(e); setShowModal(true); }}
                  onDelete={(id) => setDeleteId(id)}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <DiaryModal
          projectId={projectId}
          editing={editing}
          onSave={(entry) => {
            if (editing) {
              setEntries((prev) => prev.map((e) => e.id === entry.id ? entry : e));
            } else {
              setEntries((prev) => [entry, ...prev]);
            }
            setEditing(null);
            toast.success(editing ? 'Entry updated' : 'Entry created');
          }}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Delete Diary Entry?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
              This will permanently delete this diary entry. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
