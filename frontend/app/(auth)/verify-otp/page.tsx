'use client';

import { useState, useRef, KeyboardEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Loader2 } from 'lucide-react';

function OTPForm() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get('userId') || '';
  const email = params.get('email') || '';
  const { login } = useAuth();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when complete
    if (value && index === 5) {
      const fullCode = [...newCode].join('');
      if (fullCode.length === 6) handleSubmit(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const finalCode = fullCode || code.join('');
    if (finalCode.length !== 6) { setError('Enter all 6 digits.'); return; }
    setError('');
    setLoading(true);
    try {
      const { token } = await authApi.verifyOTP(userId, finalCode);
      await login(token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      if (e.code === 'OTP_EXPIRED') setError('Code expired. Please go back and login again.');
      else if (e.code === 'OTP_INVALID') setError('Invalid code. Please check and try again.');
      else setError('Verification failed. Please try again.');
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

        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          We sent a 6-digit code to{' '}
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{email}</span>
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '24px 0' }}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              style={{
                width: 48,
                height: 56,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 700,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                transition: 'border-color 0.15s',
                fontFamily: 'monospace',
              }}
              className="otp-input"
            />
          ))}
        </div>

        <button
          onClick={() => handleSubmit()}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading || code.join('').length !== 6}
        >
          {loading && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Code expires in 5 minutes · Single use only
        </p>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
        .auth-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-md); }
        .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .logo-icon { width: 34px; height: 34px; background: var(--text); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .logo-text { font-size: 16px; font-weight: 700; color: var(--text); }
        .auth-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .auth-subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
        :global(.otp-input:focus) { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12); }
      `}</style>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense>
      <OTPForm />
    </Suspense>
  );
}
