'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import GoogleButton from '@/components/GoogleButton';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { userId } = await authApi.login(email, password);
      toast.success('Verification code sent to your email');
      router.push(`/verify-otp?userId=${userId}&email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      let msg = 'Invalid email or password.';
      if (e.message.includes('ACCOUNT_LOCKED')) {
        msg = 'Your account is temporarily locked due to too many failed attempts. Contact support.';
      } else if (e.code === 'USE_GOOGLE_LOGIN' || e.message.includes('Google')) {
        msg = 'This account was created with Google OAuth. Please sign in with Google below.';
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">
            <Shield size={18} strokeWidth={2.5} />
          </div>
          <span className="logo-text">DevVault</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your vault</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <GoogleButton text="Sign in with Google" />

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                className="btn-icon"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div style={{ marginTop: 6, textAlign: 'right' }}>
              <Link href="/forgot-password" className="text-primary" style={{ fontSize: 12, fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> : null}
            {loading ? 'Sending code...' : 'Continue'}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary" style={{ fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
