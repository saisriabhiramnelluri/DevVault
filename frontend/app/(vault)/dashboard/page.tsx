'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { projectsApi, Project } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Key, Users, Terminal, ChevronRight, FolderOpen, Plus } from 'lucide-react';

const ACTION_CARDS = [
  {
    title: 'Environment Variables',
    description: 'Manage encrypted secrets and API keys',
    icon: Key,
    href: '/projects',
    color: '#38BDF8',
  },
  {
    title: 'Accounts',
    description: 'Track which email owns each service',
    icon: Users,
    href: '/accounts',
    color: '#A78BFA',
  },
  {
    title: 'Commands',
    description: 'Save setup and deployment commands',
    icon: Terminal,
    href: '/projects',
    color: '#34D399',
  },
  {
    title: 'Projects',
    description: 'Organize everything by project',
    icon: FolderOpen,
    href: '/projects',
    color: '#FB923C',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.list().then(({ projects }) => {
      setProjects(projects.slice(0, 3));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.email.split('@')[0] || 'there';

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-container">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
            What would you like to manage today?
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="page-container">
          {/* Action cards */}
          <div className="grid-2" style={{ marginBottom: 44, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {ACTION_CARDS.map(({ title, description, icon: Icon, href, color }) => (
              <Link
                key={title}
                href={href}
                className="card card-interactive"
                style={{ padding: 24, textDecoration: 'none', display: 'block' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: 12,
                    background: `${color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                      {title}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {description}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 3 }} />
                </div>
              </Link>
            ))}
          </div>

          {/* Recent projects */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Recent Projects</h2>
              <Link href="/projects" style={{ fontSize: 13, color: 'var(--primary-text)', textDecoration: 'none', fontWeight: 500 }}>
                View all →
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card" style={{ padding: 16, height: 72, background: 'var(--surface-hover)', opacity: 0.6 }} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <FolderOpen size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>No projects yet</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Create your first project to get started</p>
                <Link href="/projects/new" className="btn btn-primary">
                  <Plus size={14} /> Create Project
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="card card-interactive"
                    style={{ padding: '18px 22px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16 }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: 'var(--primary-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <FolderOpen size={18} style={{ color: 'var(--primary-text)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{project.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        {project._count?.envVars || 0} vars · {project._count?.accounts || 0} accounts · {project._count?.commands || 0} commands · {project._count?.diaryEntries || 0} diary entries
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
