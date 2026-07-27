'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { envVarsApi, EnvVariable, EnvCategory, EnvEnvironment, ParsedEnvVar } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { encrypt, decrypt } from '@/lib/crypto';
import {
  Plus, Search, Eye, EyeOff, Copy, Edit, Trash2, Upload, X,
  Check, Loader2, Key,
} from 'lucide-react';

const CATEGORIES: EnvCategory[] = ['DATABASE', 'AUTHENTICATION', 'CLOUD', 'PAYMENTS', 'EMAIL', 'STORAGE', 'API', 'OTHER'];
const ENVIRONMENTS: EnvEnvironment[] = ['PRODUCTION', 'DEVELOPMENT', 'STAGING', 'TESTING'];
const ENV_LABELS: Record<EnvEnvironment, string> = { PRODUCTION: 'Prod', DEVELOPMENT: 'Dev', STAGING: 'Staging', TESTING: 'Testing' };

// ── Vault Unlock Modal ─────────────────────────────────────────────────────────
function VaultUnlockModal({ onUnlock, onClose }: { onUnlock: (password: string) => Promise<void>; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onUnlock(password);
      onClose();
    } catch {
      setError('Incorrect password. Secrets could not be decrypted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>Unlock Vault</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Enter your password to decrypt secrets. Your password never leaves this device.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Password</label>
            <input type="password" className="input" placeholder="Your vault password" value={password}
              onChange={(e) => setPassword(e.target.value)} required autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
              {loading ? 'Unlocking...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Env Variable Card ──────────────────────────────────────────────────────────
function EnvVarCard({
  variable,
  vaultKey,
  onRevealRequest,
  onEdit,
  onDelete,
}: {
  variable: EnvVariable;
  vaultKey: CryptoKey | null;
  onRevealRequest: () => void;
  onEdit: (v: EnvVariable) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReveal = async () => {
    if (!vaultKey) { onRevealRequest(); return; }
    if (revealed) { setRevealed(null); return; }
    setRevealing(true);
    try {
      const plaintext = await decrypt(vaultKey, variable.ciphertext, variable.iv);
      setRevealed(plaintext);
      // Auto-hide after 30 seconds
      setTimeout(() => setRevealed(null), 30000);
    } catch {
      toast.error('Failed to decrypt. This may happen if your vault was re-keyed.');
    } finally {
      setRevealing(false);
    }
  };

  const handleCopy = async () => {
    if (!vaultKey) { onRevealRequest(); return; }
    try {
      const plaintext = revealed || await decrypt(vaultKey, variable.ciphertext, variable.iv);
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy. Please unlock vault first.');
    }
  };

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <code style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
              {variable.key}
            </code>
            <span className={`badge badge-${variable.category}`}>{variable.category}</span>
            <span className="badge badge-gray" style={{ fontSize: 10 }}>{ENV_LABELS[variable.environment]}</span>
          </div>

          {/* Value display */}
          <div style={{
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: 12,
            color: revealed ? 'var(--text)' : 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: revealed ? 'normal' : '2px',
            wordBreak: 'break-all',
            lineHeight: 1.5,
          }}>
            {revealed ? revealed : '••••••••••••••••••••'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="btn-icon"
            onClick={handleReveal}
            title={revealed ? 'Hide' : 'Reveal'}
          >
            {revealing ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> :
              revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="btn-icon" onClick={handleCopy} title="Copy value">
            {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
          </button>
          <button className="btn-icon" onClick={() => onEdit(variable)} title="Edit">
            <Edit size={14} />
          </button>
          <button
            className="btn-icon"
            style={{ color: 'var(--danger)' }}
            onClick={() => onDelete(variable.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Variable Modal ──────────────────────────────────────────────────
function EnvVarModal({
  projectId,
  editing,
  vaultKey,
  onRequestUnlock,
  onSave,
  onClose,
}: {
  projectId: string;
  editing: EnvVariable | null;
  vaultKey: CryptoKey | null;
  onRequestUnlock: () => void;
  onSave: (v: EnvVariable) => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState(editing?.key || '');
  const [value, setValue] = useState('');
  const [environment, setEnvironment] = useState<EnvEnvironment>(editing?.environment || 'PRODUCTION');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(!!editing);

  // Load existing value for editing
  useEffect(() => {
    if (editing && vaultKey) {
      decrypt(vaultKey, editing.ciphertext, editing.iv)
        .then((v) => { setValue(v); setLoadingExisting(false); })
        .catch(() => { setLoadingExisting(false); setError('Could not decrypt existing value.'); });
    } else if (editing && !vaultKey) {
      queueMicrotask(() => {
        setLoadingExisting(false);
        onRequestUnlock();
      });
    } else {
      queueMicrotask(() => {
        setLoadingExisting(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, vaultKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultKey) { onRequestUnlock(); return; }
    if (!key.trim()) { setError('Key is required'); return; }
    if (!value) { setError('Value is required'); return; }

    setLoading(true);
    setError('');
    try {
      const { ciphertext, iv } = await encrypt(vaultKey, value);
      let saved: EnvVariable;
      if (editing) {
        const { variable } = await envVarsApi.update(projectId, editing.id, { key: key.trim(), ciphertext, iv, environment });
        saved = variable;
      } else {
        const { variable } = await envVarsApi.create(projectId, { key: key.trim(), ciphertext, iv, environment });
        saved = variable;
      }
      onSave(saved);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save variable.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {editing ? 'Edit Variable' : 'Add Variable'}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loadingExisting ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader2 size={20} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--primary)' }} />
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="label">Key Name</label>
              <input
                type="text"
                className="input mono"
                placeholder="DATABASE_URL"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                required
                style={{ fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label className="label">Value <span style={{ color: 'var(--primary-text)', fontSize: 10 }}>🔐 encrypted before saving</span></label>
              <textarea
                className="input mono"
                placeholder="Enter secret value..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                rows={3}
                style={{ fontFamily: 'JetBrains Mono, monospace', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="label">Environment</label>
              <select
                className="input"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as EnvEnvironment)}
                style={{ cursor: 'pointer' }}
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
                {loading ? 'Saving...' : 'Save Variable'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Import .env Modal ──────────────────────────────────────────────────────────
function ImportModal({
  projectId,
  vaultKey,
  onRequestUnlock,
  onImported,
  onClose,
}: {
  projectId: string;
  vaultKey: CryptoKey | null;
  onRequestUnlock: () => void;
  onImported: () => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState('');
  const [parsed, setParsed] = useState<ParsedEnvVar[]>([]);
  const [environment, setEnvironment] = useState<EnvEnvironment>('PRODUCTION');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!content.trim()) return;
    setParsing(true);
    try {
      const { variables } = await envVarsApi.parse(projectId, content);
      setParsed(variables);
    } catch {
      setError('Failed to parse .env content.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!vaultKey) { onRequestUnlock(); return; }
    if (!parsed.length) { setError('Parse the .env file first.'); return; }
    setLoading(true);
    setError('');
    try {
      const variables = await Promise.all(
        parsed.map(async (v) => {
          const { ciphertext, iv } = await encrypt(vaultKey, v.value);
          return { key: v.key, ciphertext, iv, category: v.category, environment };
        })
      );
      await envVarsApi.bulk(projectId, variables);
      onImported();
      onClose();
    } catch {
      setError('Failed to import variables.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Import .env File</h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!parsed.length ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Paste your .env file content. Values will be auto-categorized and encrypted before saving.
            </p>
            <div className="form-group">
              <label className="label">Environment</label>
              <select className="input" value={environment} onChange={(e) => setEnvironment(e.target.value as EnvEnvironment)}>
                {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <textarea
              className="input mono"
              placeholder={`DATABASE_URL=postgresql://...\nJWT_SECRET=your-secret\nSTRIPE_SECRET_KEY=sk_live_...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              style={{ fontFamily: 'JetBrains Mono, monospace', resize: 'vertical', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleParse} disabled={parsing || !content.trim()}>
                {parsing ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
                {parsing ? 'Parsing...' : 'Parse File'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Found <strong>{parsed.length}</strong> variables. Review and import:
              </p>
              <button className="btn btn-ghost btn-sm" onClick={() => setParsed([])}>← Back</button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {parsed.map((v) => (
                <div key={v.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                }}>
                  <code style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{v.key}</code>
                  <span className={`badge badge-${v.category}`}>{v.category}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.value.slice(0, 20)}{v.value.length > 20 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--primary-text)', marginBottom: 12 }}>
              🔐 All values will be encrypted in your browser before storage
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setParsed([])}>← Back</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
                {loading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
                {loading ? 'Encrypting & Importing...' : `Import ${parsed.length} Variables`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function EnvVariablesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { vaultKey, unlockVault } = useAuth();
  const { toast } = useToast();

  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<EnvCategory | 'ALL'>('ALL');
  const [filterEnv, setFilterEnv] = useState<EnvEnvironment | 'ALL'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [editingVar, setEditingVar] = useState<EnvVariable | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const fetchVars = useCallback(() => {
    envVarsApi.list(projectId).then(({ variables }) => {
      setVariables(variables);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchVars(); }, [fetchVars]);

  const requestUnlock = useCallback((callback?: () => void) => {
    if (callback) setPendingAction(() => callback);
    setShowUnlockModal(true);
  }, []);

  const handleUnlock = async (password: string) => {
    await unlockVault(password);
    toast.success('Vault unlocked successfully');
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const filtered = variables.filter((v) => {
    const matchSearch = v.key.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'ALL' || v.category === filterCategory;
    const matchEnv = filterEnv === 'ALL' || v.environment === filterEnv;
    return matchSearch && matchCat && matchEnv;
  });

  // Group by category
  const grouped = filtered.reduce((acc, v) => {
    const key = v.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {} as Record<string, EnvVariable[]>);

  const handleDelete = async (id: string) => {
    try {
      await envVarsApi.delete(projectId, id);
      setVariables((prev) => prev.filter((v) => v.id !== id));
      setDeleteId(null);
      toast.success('Variable deleted');
    } catch {
      toast.error('Failed to delete variable');
      setDeleteId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Header bar */}
      <div style={{ padding: '20px 48px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', width: '100%' }}>
        <div className="page-container" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div className="search-wrap" style={{ flex: '1 1 200px', maxWidth: 320 }}>
            <Search size={14} className="search-icon" />
            <input className="input" placeholder="Search variables..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Category filter */}
          <div style={{ position: 'relative' }}>
            <select
              className="input"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as EnvCategory | 'ALL')}
              style={{ paddingLeft: 10, paddingRight: 24, cursor: 'pointer', minWidth: 120 }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Env filter */}
          <select
            className="input"
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value as EnvEnvironment | 'ALL')}
            style={{ cursor: 'pointer', minWidth: 110 }}
          >
            <option value="ALL">All Envs</option>
            {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Vault lock status */}
          {!vaultKey && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowUnlockModal(true)} style={{ gap: 5 }}>
              🔒 Unlock Vault
            </button>
          )}
          {vaultKey && (
            <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={11} /> Vault unlocked
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Actions */}
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload size={14} /> Import .env
          </button>
          <button className="btn btn-primary" onClick={() => {
            if (!vaultKey) { requestUnlock(() => setShowAddModal(true)); return; }
            setShowAddModal(true);
          }}>
            <Plus size={14} /> Add Variable
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="page-container">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <Loader2 size={20} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--primary)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Key size={40} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {search || filterCategory !== 'ALL' ? 'No variables match your filters' : 'No variables yet'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {!search && filterCategory === 'ALL' ? 'Add your first environment variable or import a .env file' : 'Try different search terms or filters'}
              </p>
              {!search && filterCategory === 'ALL' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                    <Upload size={14} /> Import .env
                  </button>
                  <button className="btn btn-primary" onClick={() => {
                    if (!vaultKey) { requestUnlock(() => setShowAddModal(true)); return; }
                    setShowAddModal(true);
                  }}>
                    <Plus size={14} /> Add Variable
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
              {Object.entries(grouped).map(([category, vars]) => (
                <div key={category}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span className={`badge badge-${category}`}>{category}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{vars.length} variable{vars.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {vars.map((v) => (
                      <EnvVarCard
                        key={v.id}
                        variable={v}
                        vaultKey={vaultKey}
                        onRevealRequest={() => requestUnlock()}
                        onEdit={(v) => {
                          setEditingVar(v);
                          if (!vaultKey) requestUnlock();
                          else setShowAddModal(true);
                        }}
                        onDelete={(id) => setDeleteId(id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showUnlockModal && (
        <VaultUnlockModal
          onUnlock={handleUnlock}
          onClose={() => { setShowUnlockModal(false); setPendingAction(null); }}
        />
      )}
      {(showAddModal || editingVar) && (
        <EnvVarModal
          projectId={projectId}
          editing={editingVar}
          vaultKey={vaultKey}
          onRequestUnlock={() => { setShowAddModal(false); setEditingVar(null); setShowUnlockModal(true); }}
          onSave={(v) => {
            if (editingVar) {
              setVariables((prev) => prev.map((x) => x.id === v.id ? v : x));
            } else {
              setVariables((prev) => [...prev, v]);
            }
            setEditingVar(null);
          }}
          onClose={() => { setShowAddModal(false); setEditingVar(null); }}
        />
      )}
      {showImportModal && (
        <ImportModal
          projectId={projectId}
          vaultKey={vaultKey}
          onRequestUnlock={() => { setShowImportModal(false); requestUnlock(() => setShowImportModal(true)); }}
          onImported={fetchVars}
          onClose={() => setShowImportModal(false)}
        />
      )}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Delete Variable?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              This will permanently delete the variable. This action cannot be undone.
            </p>
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
