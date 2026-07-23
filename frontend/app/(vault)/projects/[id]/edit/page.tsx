'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi, Project } from '@/lib/api';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';

const TECH_SUGGESTIONS = [
  'Node.js', 'Next.js', 'React', 'Vue.js', 'Python', 'Django', 'FastAPI',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'TypeScript',
  'Express.js', 'NestJS', 'Prisma', 'Supabase', 'Vercel', 'AWS', 'Firebase',
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    projectsApi.get(params.id as string).then(({ project }) => {
      setProject(project);
      setName(project.name);
      setDescription(project.description || '');
      setStack(project.stack);
      setFetchLoading(false);
    }).catch(() => setFetchLoading(false));
  }, [params.id]);

  const addTech = (tech: string) => {
    const t = tech.trim();
    if (t && !stack.includes(t)) setStack((prev) => [...prev, t]);
    setTechInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required.'); return; }
    setLoading(true); setError('');
    try {
      await projectsApi.update(params.id as string, { name: name.trim(), description: description.trim(), stack });
      router.push(`/projects/${params.id}`);
    } catch {
      setError('Failed to update project.');
      setLoading(false);
    }
  };

  if (fetchLoading) return null;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Link href={`/projects/${params.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 12 }}>
          <ArrowLeft size={14} /> {project?.name}
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Edit Project</h1>
      </div>

      <div className="page-content">
        <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="label">Project Name *</label>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="label">Tech Stack</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" className="input" placeholder="Add technology..." value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(techInput); } }} />
              <button type="button" className="btn btn-secondary" onClick={() => addTech(techInput)} disabled={!techInput.trim()}><Plus size={14} /></button>
            </div>
            {stack.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {stack.map((tech) => (
                  <span key={tech} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, background: 'var(--primary-bg)', color: 'var(--primary-text)', fontSize: 12, fontWeight: 500 }}>
                    {tech}
                    <button type="button" onClick={() => setStack((prev) => prev.filter((t) => t !== tech))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {TECH_SUGGESTIONS.filter((t) => !stack.includes(t)).map((tech) => (
                <button key={tech} type="button" className="badge badge-gray" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)' }} onClick={() => addTech(tech)}>
                  + {tech}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Link href={`/projects/${params.id}`} className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
