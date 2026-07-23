'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { deriveKey, unwrapMasterKey } from '@/lib/crypto';

interface User {
  id: string;
  email: string;
  pbkdf2Salt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  vaultKey: CryptoKey | null;
  isVaultUnlocked: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  unlockVault: (password: string) => Promise<void>;
  unlockVaultWithRecoveryKey: (recoveryKey: string) => Promise<void>;
  setMasterVaultKey: (key: CryptoKey) => void;
  lockVault: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('devvault_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      localStorage.removeItem('devvault_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchUser();
    });
  }, [fetchUser]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem('devvault_token', token);
    const { user } = await authApi.me();
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('devvault_token');
    setUser(null);
    setVaultKey(null);
  }, []);

  const unlockVault = useCallback(async (password: string) => {
    if (!user) throw new Error('Not authenticated');

    // Fetch vault details to see if using master key wrapping model
    const details = await authApi.getVaultDetails();
    const wrappingKey = await deriveKey(password, details.pbkdf2Salt);

    if (details.hasMasterKey && details.encryptedMasterKey && details.masterKeyIv) {
      // Unwrap master key using password-derived wrapping key
      const masterKey = await unwrapMasterKey(
        details.encryptedMasterKey,
        details.masterKeyIv,
        wrappingKey
      );
      setVaultKey(masterKey);
    } else {
      // Direct key derivation (legacy fallback)
      setVaultKey(wrappingKey);
    }
  }, [user]);

  const unlockVaultWithRecoveryKey = useCallback(async (recoveryKey: string) => {
    if (!user) throw new Error('Not authenticated');
    const details = await authApi.getVaultDetails();

    if (!details.recoveryEncryptedMasterKey || !details.recoveryMasterKeyIv || !details.recoverySalt) {
      throw new Error('No recovery key set up for this account');
    }

    const recoveryWrappingKey = await deriveKey(recoveryKey.trim().toUpperCase(), details.recoverySalt);
    const masterKey = await unwrapMasterKey(
      details.recoveryEncryptedMasterKey,
      details.recoveryMasterKeyIv,
      recoveryWrappingKey
    );
    setVaultKey(masterKey);
  }, [user]);

  const setMasterVaultKey = useCallback((key: CryptoKey) => {
    setVaultKey(key);
  }, []);

  const lockVault = useCallback(() => {
    setVaultKey(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        vaultKey,
        isVaultUnlocked: !!vaultKey,
        login,
        logout,
        unlockVault,
        unlockVaultWithRecoveryKey,
        setMasterVaultKey,
        lockVault,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
