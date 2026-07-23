'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Loader2 } from 'lucide-react';

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received from Google.');
      return;
    }

    async function processOAuth() {
      try {
        const redirectUri = `${window.location.origin}/google-callback`;
        const res = await authApi.googleLogin(code!, redirectUri);
        await login(res.token);

        if (!res.user.hasVaultPassword) {
          router.push('/set-vault-password');
        } else {
          router.push('/dashboard');
        }
      } catch (err: unknown) {
        console.error('Google callback error:', err);
        setError('Google authentication failed. Please try again.');
      }
    }

    void processOAuth();
  }, [searchParams, login, router]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo" style={{ justifyContent: 'center' }}>
          <div className="logo-icon"><Shield size={18} strokeWidth={2.5} /></div>
          <span className="logo-text">DevVault</span>
        </div>

        {error ? (
          <>
            <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/login')}>
              Back to Login
            </button>
          </>
        ) : (
          <div style={{ padding: '24px 0' }}>
            <Loader2 size={32} className="text-primary" style={{ animation: 'spin 0.6s linear infinite', margin: '0 auto 16px' }} />
            <h2 className="auth-title">Authenticating with Google...</h2>
            <p className="auth-subtitle">Securing your vault session</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
        .auth-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-md); }
        .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .logo-icon { width: 34px; height: 34px; background: var(--text); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .logo-text { font-size: 16px; font-weight: 700; color: var(--text); }
        .auth-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .auth-subtitle { font-size: 13px; color: var(--text-secondary); }
      `}</style>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 0.6s linear infinite' }} />
      </div>
    }>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
