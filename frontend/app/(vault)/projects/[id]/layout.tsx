'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { projectsApi, Project } from '@/lib/api';
import { FolderOpen, Key, Users, Terminal, ArrowLeft, Edit } from 'lucide-react';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    projectsApi.get(projectId).then(({ project }) => setProject(project)).catch(() => {});
  }, [projectId]);

  const tabs = [
    { label: 'Overview', href: `/projects/${projectId}`, icon: FolderOpen },
    { label: 'Env Variables', href: `/projects/${projectId}/env`, icon: Key },
    { label: 'Accounts', href: `/projects/${projectId}/accounts`, icon: Users },
    { label: 'Commands', href: `/projects/${projectId}/commands`, icon: Terminal },
  ];

  const isActive = (href: string) => {
    if (href === `/projects/${projectId}`) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div>
      {/* Project header */}
      <div className="page-header">
        <Link
          href="/projects"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 12 }}
        >
          <ArrowLeft size={12} /> Projects
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              {project?.name || '...'}
            </h1>
            {project?.description && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{project.description}</p>
            )}
          </div>
          <Link href={`/projects/${projectId}/edit`} className="btn btn-secondary btn-sm">
            <Edit size={13} /> Edit
          </Link>
        </div>

        {/* Stack tags */}
        {project?.stack && project.stack.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {project.stack.map((tech) => (
              <span key={tech} className="badge badge-gray" style={{ fontSize: 11 }}>{tech}</span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 20, borderBottom: '1px solid var(--border)', marginLeft: -32, marginRight: -32, paddingLeft: 32, paddingBottom: 0 }}>
          {tabs.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive(href) ? 'var(--primary-text)' : 'var(--text-secondary)',
                borderBottom: isActive(href) ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
