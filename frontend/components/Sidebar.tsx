'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Shield,
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Accounts', href: '/accounts', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--text)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Shield size={16} strokeWidth={2.5} style={{ color: 'var(--primary)' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            DevVault
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div style={{ padding: '12px 10px', flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 6px', marginBottom: 8 }}>
          Workspace
        </p>
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-nav-item ${isActive(href) ? 'active' : ''}`}
            style={{ marginBottom: 2 }}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        {/* User info */}
        <div style={{
          padding: '8px 10px',
          borderRadius: 'var(--radius)',
          marginBottom: 8,
          background: 'var(--bg-secondary)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Vault owner</p>
        </div>

        {/* Theme toggle */}
        <button
          className="sidebar-nav-item"
          onClick={toggleTheme}
          style={{ marginBottom: 2, width: '100%', textAlign: 'left' }}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>

        {/* Logout */}
        <button
          className="sidebar-nav-item"
          style={{ width: '100%', textAlign: 'left', color: 'var(--danger)' }}
          onClick={() => logout()}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </nav>
  );
}
