'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { accountsApi, Account, CreateAccountDto } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { encrypt, decrypt } from '@/lib/crypto';
import {
  Plus, Search, Edit, Trash2, X, Loader2, Users, Copy, Check, EyeOff, Eye,
} from 'lucide-react';

function AccountModal({
  projectId, editing, vaultKey, onRequestUnlock, onSave, onClose
}: {
  projectId: string;
  editing: Account | null;
  vaultKey: CryptoKey | null;
  onRequestUnlock: () => void;
  onSave: (a: Account) => void;
  onClose: () => void;
}) {
  const [serviceName, setServiceName] = useState(editing?.serviceName || '');
  const [email, setEmail] = useState(editing?.email || '');
  const [username, setUsername] = useState(editing?.username || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing?.notesCiphertext && editing?.notesIv && vaultKey) {
      decrypt(vaultKey, editing.notesCiphertext, editing.notesIv).then(setNotes).catch(() => {});
    }
  }, [editing, vaultKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let data: CreateAccountDto = { serviceName, email, username: username || undefined };
      if (notes && vaultKey) {
        const { ciphertext, iv } = await encrypt(vaultKey, notes);
        data = { ...data, notesCiphertext: ciphertext, notesIv: iv };
      } else if (notes && !vaultKey) {
        onRequestUnlock();
        setLoading(false);
        return;
      }

      let saved: Account;
      if (editing) {
        const { account } = await accountsApi.update(projectId, editing.id, data);
        saved = account;
      } else {
        const { account } = await accountsApi.create(projectId, data);
        saved = account;
      }
      onSave(saved);
      onClose();
    } catch {
      setError('Failed to save account.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {editing ? 'Edit Account' : 'Add Account'}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="label">Service Name *</label>
            <input type="text" className="input" placeholder="e.g. AWS, Stripe, Vercel" value={serviceName}
              onChange={(e) => setServiceName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label">Email Address *</label>
            <input type="email" className="input" placeholder="devteam@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="label">Username / Account ID</label>
            <input type="text" className="input" placeholder="company-root" value={username}
              onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">
              Notes <span style={{ color: 'var(--primary-text)', fontSize: 10 }}>{vaultKey ? '🔐 encrypted' : '(unlock vault to encrypt)'}</span>
            </label>
            <textarea className="input" placeholder="Additional account details, billing tier, recovery codes location..." value={notes}
              onChange={(e) => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
              {loading ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AccountCard({
  account, vaultKey, onEdit, onDelete, onRequestUnlock
}: {
  account: Account;
  vaultKey: CryptoKey | null;
  onEdit: (a: Account) => void;
  onDelete: (id: string) => void;
  onRequestUnlock: () => void;
}) {
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const handleShowNotes = async () => {
    if (!vaultKey) { onRequestUnlock(); return; }
    if (!account.notesCiphertext || !account.notesIv) return;
    if (notes) { setShowNotes(!showNotes); return; }
    try {
      const decrypted = await decrypt(vaultKey, account.notesCiphertext, account.notesIv);
      setNotes(decrypted);
      setShowNotes(true);
    } catch {
      toast.error('Failed to decrypt notes.');
    }
  };

  const copyEmail = async () => {
    await navigator.clipboard.writeText(account.email);
    setCopiedEmail(true);
    toast.success('Email copied');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)',
        }}>
          {account.serviceName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {account.serviceName}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 60, flexShrink: 0 }}>Email</span>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{account.email}</span>
              <button className="btn-icon" style={{ padding: 3 }} onClick={copyEmail}>
                {copiedEmail ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
              </button>
            </div>
            {account.username && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 60, flexShrink: 0 }}>Username</span>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{account.username}</span>
              </div>
            )}
          </div>
          {account.notesCiphertext && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8, padding: '3px 6px', fontSize: 11 }}
              onClick={handleShowNotes}
            >
              {showNotes ? <EyeOff size={11} /> : <Eye size={11} />}
              {showNotes ? 'Hide notes' : 'Show notes'}
            </button>
          )}
          {showNotes && notes && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text)',
              lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {notes}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={() => onEdit(account)}><Edit size={14} /></button>
          <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => onDelete(account.id)}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Vault Unlock Modal (inline) ────────────────────────────────────────────────
function VaultUnlockModal({ onUnlock, onClose }: { onUnlock: (pw: string) => Promise<void>; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await onUnlock(password); onClose(); }
    catch { setError('Incorrect password.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Unlock Vault</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Enter your password to decrypt account notes.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="password" className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { vaultKey, unlockVault } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAccounts = useCallback(() => {
    accountsApi.list(projectId).then(({ accounts }) => {
      setAccounts(accounts); setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const filtered = accounts.filter((a) =>
    a.serviceName.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await accountsApi.delete(projectId, id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setDeleteId(null);
      toast.success('Account deleted');
    } catch {
      toast.error('Failed to delete account');
      setDeleteId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div style={{ padding: '20px 48px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', width: '100%' }}>
        <div className="page-container" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '1 1 240px', maxWidth: 360 }}>
            <Search size={14} className="search-icon" />
            <input className="input" placeholder="Search by service or email..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={14} /> Add Account
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-container">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <Loader2 size={20} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--primary)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={40} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {search ? 'No accounts match your search' : 'No accounts yet'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Track which email or account owns each service
              </p>
              {!search && (
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  <Plus size={14} /> Add Account
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
              {filtered.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  vaultKey={vaultKey}
                  onEdit={(a) => { setEditing(a); setShowModal(true); }}
                  onDelete={(id) => setDeleteId(id)}
                  onRequestUnlock={() => setShowUnlock(true)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showUnlock && (
        <VaultUnlockModal
          onUnlock={async (pw) => { await unlockVault(pw); }}
          onClose={() => setShowUnlock(false)}
        />
      )}
      {showModal && (
        <AccountModal
          projectId={projectId}
          editing={editing}
          vaultKey={vaultKey}
          onRequestUnlock={() => { setShowModal(false); setShowUnlock(true); }}
          onSave={(a) => {
            if (editing) setAccounts((prev) => prev.map((x) => x.id === a.id ? a : x));
            else setAccounts((prev) => [...prev, a]);
            setEditing(null);
          }}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Delete Account?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>This will permanently remove the account record.</p>
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
