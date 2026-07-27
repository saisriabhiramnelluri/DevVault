'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { projectsApi, Project } from '@/lib/api';
import { Key, Users, Terminal, BookOpen, Clock } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

export default function ProjectOverviewPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    projectsApi.get(params.id as string).then(({ project }) => setProject(project));
  }, [params.id]);

  if (!project) return null;

  const stats = [
    { label: 'Environment Variables', value: project._count?.envVars || 0, icon: Key, href: 'env', color: '#38BDF8' },
    { label: 'Accounts', value: project._count?.accounts || 0, icon: Users, href: 'accounts', color: '#A78BFA' },
    { label: 'Commands', value: project._count?.commands || 0, icon: Terminal, href: 'commands', color: '#34D399' },
    { label: 'Diary Entries', value: project._count?.diaryEntries || 0, icon: BookOpen, href: 'diary', color: '#F472B6' },
  ];

  return (
    <div className="page-content animate-fade-in">
      <div style={{ maxWidth: 800 }}>
        <div className="grid-3" style={{ marginBottom: 32, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {stats.map(({ label, value, icon: Icon, href, color }) => (
            <Link
              key={label}
              href={`/projects/${project.id}/${href}`}
              className="card card-interactive"
              style={{ padding: 22, textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Icon size={16} style={{ color }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{value}</p>
            </Link>
          ))}
        </div>

        {/* Dates */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Project Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} /> Created
              </span>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{formatDate(project.createdAt)}</span>
            </div>
            <div className="divider" style={{ margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} /> Last updated
              </span>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{formatDate(project.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
