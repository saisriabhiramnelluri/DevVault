'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { projectsApi, Project } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { FolderOpen, Plus, Search, ChevronRight, Key, Users, Terminal, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/dateUtils';

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    projectsApi.list().then(({ projects }) => {
      setProjects(projects);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
      toast.success('Project deleted successfully');
    } catch {
      toast.error('Failed to delete project');
      setDeleteId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header">
        <div className="page-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>Projects</h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {projects.length} project{projects.length !== 1 ? 's' : ''} in your vault
              </p>
            </div>
            <Link href="/projects/new" className="btn btn-primary">
              <Plus size={14} /> New Project
            </Link>
          </div>

          {/* Search */}
          <div className="search-wrap" style={{ marginTop: 20, maxWidth: 400 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="input"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="page-container">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ padding: 24, height: 96, background: 'var(--surface-hover)', opacity: 0.6 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={44} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {search ? 'No projects match your search' : 'No projects yet'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {search ? 'Try a different search term' : 'Create your first project to start managing secrets and documentation'}
              </p>
              {!search && (
                <Link href="/projects/new" className="btn btn-primary">
                  <Plus size={14} /> Create Project
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="card"
                  style={{ padding: '20px 24px', position: 'relative' }}
                >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: 'var(--primary-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FolderOpen size={18} style={{ color: 'var(--primary-text)' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                        {project.name}
                      </p>
                    </Link>
                    {project.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Key size={11} /> {project._count?.envVars || 0} variables
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Users size={11} /> {project._count?.accounts || 0} accounts
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Terminal size={11} /> {project._count?.commands || 0} commands
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Updated {formatDistanceToNow(project.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Link href={`/projects/${project.id}`} className="btn btn-secondary btn-sm" style={{ display: 'none' }}>
                      Open <ChevronRight size={12} />
                    </Link>
                    <Link href={`/projects/${project.id}`} className="btn btn-secondary btn-sm">
                      Open <ChevronRight size={12} />
                    </Link>
                    <div style={{ position: 'relative' }} ref={openMenu === project.id ? menuRef : null}>
                      <button
                        className="btn-icon"
                        onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenu === project.id && (
                        <div
                          style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 20,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                            padding: 4, minWidth: 140, marginTop: 4,
                          }}
                        >
                          <Link
                            href={`/projects/${project.id}/edit`}
                            className="btn btn-ghost btn-sm"
                            style={{ width: '100%', justifyContent: 'flex-start', padding: '7px 10px' }}
                          >
                            <Edit size={13} /> Edit
                          </Link>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ width: '100%', justifyContent: 'flex-start', padding: '7px 10px', color: 'var(--danger)' }}
                            onClick={() => { setDeleteId(project.id); setOpenMenu(null); }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stack tags */}
                {project.stack.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', paddingLeft: 56 }}>
                    {project.stack.map((tech) => (
                      <span key={tech} className="badge badge-gray" style={{ fontSize: 10 }}>{tech}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Delete Project?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
              This will permanently delete the project and all its environment variables, accounts, and commands. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
