'use client';

import { useEffect, useState } from 'react';
import { authApi, Session, AuditLog } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Monitor, Trash2, Loader2, ShieldCheck, Clock, FileText } from 'lucide-react';
import { formatDateTime, formatDistanceToNow } from '@/lib/dateUtils';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: '🔐 Login',
  LOGIN_GOOGLE: '🔐 Google Login',
  LOGOUT: '🚪 Logout',
  PASSWORD_RESET: '🔑 Password reset',
  VAULT_SETUP: '🛡️ Vault setup',
  VAULT_RECOVERED: '🔓 Vault recovered',
  PROJECT_CREATED: '📁 Project created',
  PROJECT_UPDATED: '✏️ Project updated',
  PROJECT_DELETED: '🗑️ Project deleted',
  SECRET_CREATED: '🔒 Secret created',
  SECRET_UPDATED: '✏️ Secret updated',
  SECRET_DELETED: '🗑️ Secret deleted',
  SECRETS_BULK_IMPORTED: '📦 Bulk import',
  ACCOUNT_ADDED: '👤 Account added',
  ACCOUNT_UPDATED: '✏️ Account updated',
  ACCOUNT_REMOVED: '🗑️ Account removed',
  COMMAND_CREATED: '⌨️ Command created',
  COMMAND_UPDATED: '✏️ Command updated',
  COMMAND_DELETED: '🗑️ Command deleted',
  DIARY_ENTRY_CREATED: '📝 Diary entry created',
  DIARY_ENTRY_UPDATED: '✏️ Diary entry updated',
  DIARY_ENTRY_DELETED: '🗑️ Diary entry deleted',
};

type Tab = 'sessions' | 'audit';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    authApi.getSessions().then(({ sessions }) => {
      setSessions(sessions);
      setLoadingSessions(false);
    }).catch(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (tab === 'audit' && auditLogs.length === 0) {
      queueMicrotask(() => {
        setLoadingLogs(true);
        import('@/lib/api').then(({ auditApi }) => {
          auditApi.list().then(({ logs }) => {
            setAuditLogs(logs);
            setLoadingLogs(false);
          }).catch(() => setLoadingLogs(false));
        });
      });
    }
  }, [tab, auditLogs.length]);

  const handleRevokeSession = async (id: string) => {
    setRevoking(id);
    try {
      await authApi.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header" style={{ paddingBottom: 0 }}>
        <div className="page-container">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage sessions and security</p>

          {/* Tabs — scrollable on mobile */}
          <div style={{
            display: 'flex',
            gap: 4,
            marginTop: 24,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 0,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {[
              { key: 'sessions', label: 'Active Sessions', icon: Monitor },
              { key: 'audit', label: 'Audit Log', icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key as Tab)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 18px', fontSize: 13, fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === key ? 'var(--primary-text)' : 'var(--text-secondary)',
                  borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1, fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="page-container">
          <div>
          {/* Profile card */}
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: 'var(--primary-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: 'var(--primary-text)',
                flexShrink: 0,
              }}>
                {user?.email.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: 11, color: 'var(--success)' }}>2FA enabled · Vault encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sessions tab */}
          {tab === 'sessions' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Active Sessions <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({sessions.length})</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  <Clock size={11} /> Sessions expire after 1 hour
                </div>
              </div>

              {loadingSessions ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <Loader2 size={18} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--primary)' }} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active sessions
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map((session) => (
                    <div key={session.id} className="card" style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Monitor size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {session.deviceInfo || 'Unknown device'}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {session.ipAddress || 'Unknown IP'} · Created {formatDistanceToNow(session.createdAt)} · Expires {formatDateTime(session.expiresAt)}
                          </p>
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revoking === session.id}
                          style={{ flexShrink: 0 }}
                        >
                          {revoking === session.id
                            ? <Loader2 size={12} style={{ animation: 'spin 0.6s linear infinite' }} />
                            : <Trash2 size={12} />
                          }
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    toast.info('Signing out of all devices...');
                    logout();
                  }}
                >
                  Sign out of all devices
                </button>
              </div>
            </>
          )}

          {/* Audit Log tab */}
          {tab === 'audit' && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Recent Activity</p>
              {loadingLogs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <Loader2 size={18} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--primary)' }} />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs yet</div>
              ) : (
                <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                  {auditLogs.map((log, i) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 18px',
                        borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: 'var(--text)' }}>
                          {ACTION_LABELS[log.action] || log.action}
                          {log.resource && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>· {log.resource}</span>}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDateTime(log.createdAt)}
                          {log.ipAddress ? ` · ${log.ipAddress}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
