'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Shield, Eye, EyeOff, Loader2, Check } from 'lucide-react';

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

import GoogleButton from '@/components/GoogleButton';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const allValid = passwordRules.every((r) => r.test(password));
    if (!allValid) {
      setError('Password does not meet requirements.');
      return;
    }
    setLoading(true);
    try {
      const { userId } = await authApi.register(email, password);
      router.push(`/verify-otp?userId=${userId}&email=${encodeURIComponent(email)}&mode=register`);
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      if (e.code === 'EMAIL_EXISTS') {
        setError('An account with this email already exists.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon"><Shield size={18} strokeWidth={2.5} /></div>
          <span className="logo-text">DevVault</span>
        </div>

        <h1 className="auth-title">Create your vault</h1>
        <p className="auth-subtitle">Your secrets, encrypted and yours alone</p>

        {error && <div className="alert alert-error">{error}</div>}

        <GoogleButton text="Sign up with Google" />

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
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
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">Vault password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

            {/* Password requirements */}
            {password && (
              <ul style={{ listStyle: 'none', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {passwordRules.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <li key={rule.label} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12,
                      color: passed ? 'var(--success)' : 'var(--text-muted)'
                    }}>
                      <Check size={12} style={{ opacity: passed ? 1 : 0.3 }} />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            marginBottom: 16,
            fontSize: 12,
            color: 'var(--warning)',
          }}>
            ⚠️ Your password encrypts your vault. If you forget it, encrypted secrets are unrecoverable.
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
            {loading ? 'Creating vault...' : 'Create Vault'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" className="text-primary" style={{ fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
        .auth-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-md); }
        .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .logo-icon { width: 34px; height: 34px; background: var(--text); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .logo-text { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
        .auth-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 6px; letter-spacing: -0.3px; }
        .auth-subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 24px; }
      `}</style>
    </div>
  );
}
