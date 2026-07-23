'use client';

import { useEffect, useState } from 'react';
import { authApi, Session, AuditLog } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Monitor, Trash2, Loader2, ShieldCheck, Clock, FileText } from 'lucide-react';
import { formatDateTime, formatDistanceToNow } from '@/lib/dateUtils';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: '🔐 Login',
  LOGOUT: '🚪 Logout',
  PASSWORD_RESET: '🔑 Password reset',
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
};

type Tab = 'sessions' | 'audit';

export default function SettingsPage() {
  const { user, logout } = useAuth();
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
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Manage sessions and security</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 20, borderBottom: '1px solid var(--border)', marginLeft: -32, marginRight: -32, paddingLeft: 32, paddingBottom: 0 }}>
          {[
            { key: 'sessions', label: 'Active Sessions', icon: Monitor },
            { key: 'audit', label: 'Audit Log', icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', fontSize: 13, fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === key ? 'var(--primary-text)' : 'var(--text-secondary)',
                borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1, fontFamily: 'inherit',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: 640 }}>
          {/* Profile card */}
          <div className="card" style={{ padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'var(--primary-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: 'var(--primary-text)',
              }}>
                {user?.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{user?.email}</p>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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
                    <div key={session.id} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

              <div style={{ marginTop: 20 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => logout()}
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
                        padding: '10px 16px',
                        borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
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
  );
}
