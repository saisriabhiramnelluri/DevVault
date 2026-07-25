'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex' }}>
      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
