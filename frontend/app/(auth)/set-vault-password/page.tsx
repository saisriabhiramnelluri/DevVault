'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import {
  generateMasterKey,
  generateRecoveryKey,
  generateSalt,
  deriveKey,
  wrapMasterKey,
} from '@/lib/crypto';
import { Shield, Eye, EyeOff, Loader2, Key, Copy, Check, ShieldAlert, ArrowRight } from 'lucide-react';

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export default function SetVaultPasswordPage() {
  const router = useRouter();
  const { user, setMasterVaultKey } = useAuth();

  const [step, setStep] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generated Recovery Key & Master Key state
  const [recoveryKey, setRecoveryKey] = useState('');
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmedSave, setConfirmedSave] = useState(false);

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isValid = passwordRules.every((r) => r.test(password));
    if (!isValid) {
      setError('Password does not meet minimum security requirements.');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch current user salt
      const saltDetails = await authApi.getPbkdf2Salt();
      const pbkdf2Salt = saltDetails.pbkdf2Salt;

      // 2. Generate Master Key & Recovery Key
      const newMasterKey = await generateMasterKey();
      const newRecoveryKey = generateRecoveryKey();
      const recoverySalt = generateSalt();

      // 3. Derive Wrapping Keys
      const passwordWrappingKey = await deriveKey(password, pbkdf2Salt);
      const recoveryWrappingKey = await deriveKey(newRecoveryKey, recoverySalt);

      // 4. Wrap Master Key with both keys
      const passwordWrapped = await wrapMasterKey(newMasterKey, passwordWrappingKey);
      const recoveryWrapped = await wrapMasterKey(newMasterKey, recoveryWrappingKey);

      // 5. Send encrypted keys to server
      await authApi.setupVault({
        encryptedMasterKey: passwordWrapped.encryptedMasterKey,
        masterKeyIv: passwordWrapped.iv,
        recoveryEncryptedMasterKey: recoveryWrapped.encryptedMasterKey,
        recoveryMasterKeyIv: recoveryWrapped.iv,
        recoverySalt: recoverySalt,
      });

      setMasterKey(newMasterKey);
      setRecoveryKey(newRecoveryKey);
      setStep('recovery');
    } catch (err: unknown) {
      console.error('Vault setup error:', err);
      setError('Failed to setup vault. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleFinishSetup = () => {
    if (masterKey) {
      setMasterVaultKey(masterKey);
    }
    router.push('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: step === 'recovery' ? 520 : 420 }}>
        <div className="auth-logo">
          <div className="logo-icon"><Shield size={18} strokeWidth={2.5} /></div>
          <span className="logo-text">DevVault</span>
        </div>

        {step === 'password' ? (
          <div>
            <h1 className="auth-title">Set Vault Password</h1>
            <p className="auth-subtitle">
              Create a vault password to encrypt your secrets. DevVault never sees this password or your raw keys.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleCreateVault}>
              <div className="form-group">
                <label className="label" htmlFor="password">Vault Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="Create your vault password"
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
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: 12,
                color: 'var(--warning)',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start'
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Zero-Knowledge Security:</strong> This password is used client-side to generate your encryption keys. We cannot reset it for you if lost, but we will generate a <strong>Recovery Key</strong> on the next step.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />}
                {loading ? 'Initializing Vault Key...' : 'Set Vault Password'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--primary-bg)',
                color: 'var(--primary-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Key size={24} />
              </div>
              <h1 className="auth-title">Your Recovery Key</h1>
              <p className="auth-subtitle">
                Save this key in a secure password manager or physical notebook. It allows you to recover your vault if you ever forget your vault password.
              </p>
            </div>

            {/* Recovery Key Box */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius)',
              padding: '16px',
              margin: '20px 0',
              textAlign: 'center',
              position: 'relative'
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
                {recoveryKey}
              </div>

              <button
                onClick={handleCopyRecoveryKey}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12, marginInline: 'auto' }}
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {copied ? 'Copied to Clipboard!' : 'Copy Recovery Key'}
              </button>
            </div>

            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              marginBottom: 20,
              fontSize: 12,
              color: 'var(--danger)',
              lineHeight: 1.5
            }}>
              <strong>⚠️ WARNING:</strong> DevVault staff cannot recover your account or decrypt your data. If you lose both your vault password and this recovery key, your encrypted secrets will be lost permanently.
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
              <span>I have safely backed up my Recovery Key in a secure place.</span>
            </label>

            <button
              onClick={handleFinishSetup}
              disabled={!confirmedSave}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Continue to Dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
