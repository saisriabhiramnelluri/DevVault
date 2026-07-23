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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          What would you like to manage today?
        </p>
      </div>

      <div className="page-content">
        {/* Action cards — RailOne style */}
        <div className="grid-2" style={{ marginBottom: 32, maxWidth: 720 }}>
          {ACTION_CARDS.map(({ title, description, icon: Icon, href, color }) => (
            <Link
              key={title}
              href={href}
              className="card card-interactive"
              style={{ padding: 20, textDecoration: 'none', display: 'block' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 10,
                  background: `${color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                    {title}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {description}
                  </p>
                </div>
                <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent projects */}
        <div style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Recent Projects</h2>
            <Link href="/projects" style={{ fontSize: 12, color: 'var(--primary-text)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ padding: 16, flex: 1, height: 80, background: 'var(--surface-hover)' }} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <FolderOpen size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, marginBottom: 6 }}>No projects yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Create your first project to get started</p>
              <Link href="/projects/new" className="btn btn-primary">
                <Plus size={14} /> Create Project
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="card"
                  style={{ padding: '14px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--primary-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FolderOpen size={16} style={{ color: 'var(--primary-text)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{project.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {project._count?.envVars || 0} vars · {project._count?.accounts || 0} accounts · {project._count?.commands || 0} commands
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
