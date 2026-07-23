'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { deriveKey } from '@/lib/crypto';

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
    const key = await deriveKey(password, user.pbkdf2Salt);
    setVaultKey(key);
  }, [user]);

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
