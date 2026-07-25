'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Shield, Loader2 } from 'lucide-react';

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode / Suspense re-mounts calling this twice
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received from Google.');
      toast.error('No authorization code received from Google.');
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
        toast.error('Google authentication failed. Please try again.');
      }
    }

    void processOAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
