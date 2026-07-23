'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Shield, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

type Step = 'email' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setMessage('If that email is registered, a reset code has been sent.');
      setStep('reset');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must be at least 8 chars with one uppercase and one number.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email, code, newPassword);
      router.push('/login?reset=true');
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'OTP_EXPIRED') setError('Code expired. Please request a new one.');
      else if (e.code === 'OTP_INVALID') setError('Invalid code.');
      else setError('Reset failed. Please try again.');
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

        {step === 'email' ? (
          <>
            <h1 className="auth-title">Reset vault password</h1>
            <p className="auth-subtitle">Enter your email to receive a reset code</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSendCode}>
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

              <div style={{
                background: 'var(--warning-bg)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--warning)',
                lineHeight: 1.5,
              }}>
                🔑 <strong>Have a Recovery Key?</strong> You can recover your vault without losing any encrypted secrets! <Link href="/recover-vault" style={{ textDecoration: 'underline', color: 'var(--warning)', fontWeight: 600 }}>Use Recovery Key →</Link>
              </div>

              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--danger)',
              }}>
                ⚠️ Standard email password reset will clear all encrypted secrets because your encryption key is tied to your password.
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              className="btn-icon"
              style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}
              onClick={() => { setStep('email'); setError(''); }}
            >
              <ArrowLeft size={14} /> Back
            </button>

            <h1 className="auth-title">Enter reset code</h1>
            {message && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{message}</p>}

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleReset}>
              <div className="form-group">
                <label className="label" htmlFor="code">6-digit code</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="newpass">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="newpass"
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="New strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
            <ArrowLeft size={12} /> Back to login
          </Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
        .auth-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-md); }
        .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .logo-icon { width: 34px; height: 34px; background: var(--text); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .logo-text { font-size: 16px; font-weight: 700; color: var(--text); }
        .auth-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .auth-subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 24px; }
      `}</style>
    </div>
  );
}
