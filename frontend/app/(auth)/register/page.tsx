'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Shield, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import GoogleButton from '@/components/GoogleButton';

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export default function RegisterPage() {
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
    const allValid = passwordRules.every((r) => r.test(password));
    if (!allValid) {
      const msg = 'Password does not meet requirements.';
      setError(msg);
      toast.warning(msg);
      return;
    }
    setLoading(true);
    try {
      const { userId } = await authApi.register(email, password);
      toast.success('Verification code sent to your email');
      router.push(`/verify-otp?userId=${userId}&email=${encodeURIComponent(email)}&mode=register`);
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      let msg = 'Registration failed. Please try again.';
      if (e.code === 'EMAIL_EXISTS') {
        msg = 'An account with this email already exists.';
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
        <div className="auth-logo">
          <div className="logo-icon"><Shield size={18} strokeWidth={2.5} /></div>
          <span className="logo-text">DevVault</span>
        </div>

        <h1 className="auth-title">Create your vault</h1>
        <p className="auth-subtitle">Your secrets, encrypted and yours alone</p>

        {error && <div className="alert alert-error">{error}</div>}

        <GoogleButton text="Sign up with Google" />

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
                      color: passed ? 'var(--success)' : 'var(--text-muted)',
                      transition: 'color 0.2s ease',
                    }}>
                      <Check size={12} style={{ opacity: passed ? 1 : 0.3, transition: 'opacity 0.2s' }} />
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
            padding: '12px 14px',
            marginBottom: 18,
            fontSize: 12,
            color: 'var(--warning)',
            lineHeight: 1.5,
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

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/login" className="text-primary" style={{ fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
