'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import {
  deriveKey,
  unwrapMasterKey,
  wrapMasterKey,
  generateRecoveryKey,
  generateSalt,
  bufferToBase64,
} from '@/lib/crypto';
import { Shield, Key, Eye, EyeOff, Loader2, Copy, Check, ArrowLeft, ArrowRight } from 'lucide-react';

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export default function RecoverVaultPage() {
  const router = useRouter();

  const [step, setStep] = useState<'input' | 'new-password' | 'new-recovery'>('input');
  const [email, setEmail] = useState('');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preserved Master Key during recovery transition
  const [unwrappedMasterKey, setUnwrappedMasterKey] = useState<CryptoKey | null>(null);
  const [newRecoveryKey, setNewRecoveryKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmedSave, setConfirmedSave] = useState(false);

  const handleVerifyRecoveryKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Fetch recovery data for email
      const recoveryData = await authApi.getRecoveryData(email.trim());

      // 2. Derive recovery wrapping key
      const formattedKey = recoveryKeyInput.trim().toUpperCase();
      const recoveryWrappingKey = await deriveKey(formattedKey, recoveryData.recoverySalt);

      // 3. Attempt to unwrap master key
      const masterKey = await unwrapMasterKey(
        recoveryData.recoveryEncryptedMasterKey,
        recoveryData.recoveryMasterKeyIv,
        recoveryWrappingKey
      );

      setUnwrappedMasterKey(masterKey);
      setStep('new-password');
    } catch (err: unknown) {
      console.error('Recovery error:', err);
      setError('Invalid recovery key or email. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isValid = passwordRules.every((r) => r.test(newPassword));
    if (!isValid) {
      setError('New password does not meet requirements.');
      return;
    }

    if (!unwrappedMasterKey) {
      setError('Session expired. Please restart recovery process.');
      setStep('input');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate new recovery key & salt
      const generatedNewRecoveryKey = generateRecoveryKey();
      const newRecoverySalt = generateSalt();

      // 2. Derive new password wrapping key using email's pbkdf2Salt
      // We fetch current pbkdf2Salt from recoveryData
      const recoveryData = await authApi.getRecoveryData(email.trim());
      const passwordWrappingKey = await deriveKey(newPassword, recoveryData.pbkdf2Salt);
      const newRecoveryWrappingKey = await deriveKey(generatedNewRecoveryKey, newRecoverySalt);

      // 3. Re-wrap existing master key with new credentials
      const passwordWrapped = await wrapMasterKey(unwrappedMasterKey, passwordWrappingKey);
      const recoveryWrapped = await wrapMasterKey(unwrappedMasterKey, newRecoveryWrappingKey);

      // Simple bcrypt-like password hash simulation for backend auth verification
      // (Backend will receive passwordHash)
      const enc = new TextEncoder();
      const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(newPassword));
      const passwordHashHex = bufferToBase64(hashBuf);

      // 4. Submit updated encrypted master key to backend
      await authApi.recoverVault({
        email: email.trim(),
        passwordHash: passwordHashHex,
        encryptedMasterKey: passwordWrapped.encryptedMasterKey,
        masterKeyIv: passwordWrapped.iv,
        newRecoveryEncryptedMasterKey: recoveryWrapped.encryptedMasterKey,
        newRecoveryMasterKeyIv: recoveryWrapped.iv,
        newRecoverySalt: newRecoverySalt,
      });

      setNewRecoveryKey(generatedNewRecoveryKey);
      setStep('new-recovery');
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      setError('Failed to update vault password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNewRecoveryKey = () => {
    navigator.clipboard.writeText(newRecoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: step === 'new-recovery' ? 520 : 420 }}>
        <div className="auth-logo">
          <div className="logo-icon"><Shield size={18} strokeWidth={2.5} /></div>
          <span className="logo-text">DevVault</span>
        </div>

        {step === 'input' && (
          <div>
            <h1 className="auth-title">Recover Vault Access</h1>
            <p className="auth-subtitle">
              Enter your account email and your 29-character Recovery Key to unlock your encrypted secrets.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleVerifyRecoveryKey}>
              <div className="form-group">
                <label className="label" htmlFor="email">Account Email</label>
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
                <label className="label" htmlFor="recoveryKey">Recovery Key</label>
                <input
                  id="recoveryKey"
                  type="text"
                  className="input"
                  placeholder="DVRK-XXXX-XXXX-XXXX-XXXX-XXXX"
                  value={recoveryKeyInput}
                  onChange={(e) => setRecoveryKeyInput(e.target.value)}
                  required
                  style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
                {loading ? 'Decrypting Vault Key...' : 'Verify Recovery Key'}
              </button>
            </form>
          </div>
        )}

        {step === 'new-password' && (
          <div>
            <h1 className="auth-title">Set New Vault Password</h1>
            <p className="auth-subtitle">
              Recovery key verified! Your vault master key was successfully decrypted. Now set a new password to protect your vault.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSetNewPassword}>
              <div className="form-group">
                <label className="label" htmlFor="newPassword">New Vault Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="newPassword"
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

                {newPassword && (
                  <ul style={{ listStyle: 'none', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {passwordRules.map((rule) => {
                      const passed = rule.test(newPassword);
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

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
                {loading ? 'Re-encrypting Vault...' : 'Save New Password'}
              </button>
            </form>
          </div>
        )}

        {step === 'new-recovery' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Key size={24} />
              </div>
              <h1 className="auth-title">New Recovery Key Generated</h1>
              <p className="auth-subtitle">
                Your vault password has been updated and a new Recovery Key has been generated for your account.
              </p>
            </div>

            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius)',
              padding: '16px',
              margin: '20px 0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '1.5px',
                fontFamily: 'monospace',
                color: 'var(--text)',
                userSelect: 'all',
                wordBreak: 'break-all'
              }}>
                {newRecoveryKey}
              </div>

              <button
                onClick={handleCopyNewRecoveryKey}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12, marginInline: 'auto' }}
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {copied ? 'Copied to Clipboard!' : 'Copy New Recovery Key'}
              </button>
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              fontSize: 13,
              marginBottom: 24,
              color: 'var(--text-secondary)'
            }}>
              <input
                type="checkbox"
                checked={confirmedSave}
                onChange={(e) => setConfirmedSave(e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--primary)' }}
              />
              <span>I have backed up my new Recovery Key in a safe place.</span>
            </label>

            <button
              onClick={() => router.push('/login?recovered=true')}
              disabled={!confirmedSave}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Proceed to Login <ArrowRight size={16} />
            </button>
          </div>
        )}

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
            <ArrowLeft size={12} /> Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
