'use client';

import { useState } from 'react';
import { accountsApi, AccountWithProject } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Search, Users, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function GlobalAccountsPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<AccountWithProject[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const { accounts } = await accountsApi.searchByEmail(email);
      setResults(accounts);
      setSearched(true);
      if (accounts.length > 0) {
        toast.success(`Found ${accounts.length} service${accounts.length !== 1 ? 's' : ''}`);
      }
    } catch {
      setSearched(true);
      setResults([]);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header">
        <div className="page-container">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>Account Search</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Find every service tied to a specific email account
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="page-container">
          <div style={{ maxWidth: 680 }}>
          {/* Search box */}
          <div className="card" style={{ padding: 28, marginBottom: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Search by Email
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Enter an email address to see all services, platforms, and accounts linked to it across all your projects.
            </p>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
              <div className="search-wrap" style={{ flex: 1 }}>
                <Search size={14} className="search-icon" />
                <input
                  type="email"
                  className="input"
                  placeholder="devteam@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          {/* Results */}
          {searched && !loading && (
            <div>
              {results.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <Users size={32} style={{ color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>No accounts found</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No services are linked to <strong>{email}</strong>
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Found <strong>{results.length}</strong> service{results.length !== 1 ? 's' : ''} linked to <strong>{email}</strong>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {results.map((account) => (
                      <Link
                        key={account.id}
                        href={`/projects/${account.project.id}/accounts`}
                        className="card"
                        style={{ padding: '14px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: 'var(--primary-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'var(--primary-text)',
                        }}>
                          {account.serviceName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{account.serviceName}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {account.username ? `@${account.username} · ` : ''}
                            Project: {account.project.name}
                          </p>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Explanation */}
          {!searched && (
            <div className="card" style={{ padding: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Why use this?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { q: 'Which email owns AWS?', a: 'Search the email to see all linked services instantly.' },
                  { q: 'Which account owns Stripe?', a: 'Stop guessing — find the service owner in seconds.' },
                  { q: 'What did devteam@gmail.com create?', a: 'See every service tied to that account.' },
                ].map(({ q, a }) => (
                  <div key={q}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{q}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
